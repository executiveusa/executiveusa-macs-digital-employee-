import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SYSTEM = `You are MAXX, the proposed digital employee for MACS Digital Media. This is a public, non-authenticated educational demonstration, NOT a connected customer workspace. Speak to a busy founder in clear, concise, practical language. Answer the visitor's question with a useful, specific example and a realistic next step. You can describe how an assistant could help with leads, appointment requests, follow-ups, admin, social content and review queues. Do not claim you accessed emails, calls, CRM, databases, private records, appointments, or customer information. Never claim work was performed or a message was sent. Never request secrets, sensitive personal information, or payments. No tools or actions are available in this demo. For customer-specific actions, explain that integrations and owner approval require a separate, verified setup. When appropriate, mention a conversation with MACS to scope one small workflow. Keep the answer under 130 words.`;

type Msg = { role: 'user' | 'assistant'; content: string };
function encode(obj: unknown) { return new TextEncoder().encode('data: ' + JSON.stringify(obj) + '\n\n'); }
function cleanMessages(value: unknown): Msg[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 9) return null;
  const messages: Msg[] = [];
  for (const entry of value) {
    if (!entry || (entry.role !== 'user' && entry.role !== 'assistant') || typeof entry.content !== 'string' || entry.content.length < 1 || entry.content.length > 900) return null;
    messages.push({ role: entry.role, content: entry.content });
  }
  if (messages.at(-1)?.role !== 'user') return null;
  return messages;
}
export async function GET() {
  return Response.json({ enabled: Boolean(process.env.INCEPTION_API_KEY && process.env.MAXX_PUBLIC_DEMO_ENABLED === 'true'), mode: 'mercury-diffusion' }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (!process.env.INCEPTION_API_KEY || process.env.MAXX_PUBLIC_DEMO_ENABLED !== 'true') {
    return Response.json({ error: 'live_unavailable', detail: 'Live Mercury diffusion is not connected yet. No simulated answer was generated.' }, { status: 503 });
  }
  const size = Number(request.headers.get('content-length') || 0);
  if (size > 12000) return Response.json({ error: 'request_too_large' }, { status: 413 });
  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }); }
  const messages = cleanMessages((input as { messages?: unknown } | null)?.messages);
  if (!messages) return Response.json({ error: 'invalid_messages' }, { status: 400 });

  // Public proof-of-concept guardrails: server-side key, bounded input/output, no tools,
  // and no automatic retry or fake fallback. Configure provider-side spending and rate limits.
  let upstream: Response;
  try {
    upstream = await fetch('https://api.inceptionlabs.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.INCEPTION_API_KEY },
      body: JSON.stringify({
        model: 'mercury-3', messages: [{ role: 'system', content: SYSTEM }, ...messages],
        stream: true, diffusing: true, max_completion_tokens: 1536, reasoning_effort: 'instant',
      }),
      signal: AbortSignal.timeout(24000),
      cache: 'no-store',
    });
  } catch {
    return Response.json({ error: 'upstream_unreachable' }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: 'provider_error', status: upstream.status }, { status: 502 });
  }

  let finished = false;
  let upstreamReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encode({ type: 'mode', mode: 'diffusing', source: 'inception-mercury-3' }));
      const decoder = new TextDecoder();
      let pending = '';
      let snapshot = '';
      let snapshots = 0;
      upstreamReader = upstream.body!.getReader();
      try {
        while (true) {
          const { value, done } = await upstreamReader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          if (pending.length > 500000) throw new Error('stream_overflow');
          const lines = pending.split('\n');
          pending = lines.pop() || '';
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') { finished = true; break; }
            if (!data) continue;
            let chunk: any;
            try { chunk = JSON.parse(data); } catch { continue; }
            if (chunk.error) throw new Error('provider_stream_error');
            const text = chunk.choices?.[0]?.delta?.content;
            if (typeof text === 'string' && text !== '') {
              // Diffusion chunks are FULL refinement snapshots; never append them.
              snapshot = text;
              snapshots++;
              if (snapshot.length > 16000) throw new Error('output_limit');
              controller.enqueue(encode({ type: 'snapshot', text: snapshot }));
            }
          }
          if (finished) break;
        }
        if (!snapshot) throw new Error('empty_response');
        controller.enqueue(encode({ type: 'final', text: snapshot, snapshots }));
      } catch {
        controller.enqueue(encode({ type: 'error', message: 'The live response was interrupted. Please try again.' }));
      } finally {
        try { await upstreamReader?.cancel(); } catch { /* ignored */ }
        controller.close();
      }
    },
    async cancel() { try { await upstreamReader?.cancel(); } catch { /* ignored */ } },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-content-type-options': 'nosniff', 'x-accel-buffering': 'no' } });
}

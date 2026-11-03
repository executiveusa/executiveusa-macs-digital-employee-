'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, CheckCircle2, Loader2, Send, ShieldCheck, Sparkles, Square, WifiOff } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };
type Phase = 'idle' | 'connecting' | 'refining' | 'ready' | 'offline' | 'error';
type StreamEvent = { type: 'mode' | 'snapshot' | 'final' | 'error'; text?: string; snapshots?: number; message?: string };
const PROMPTS = [
  { eyebrow: '01 / LEADS', label: 'Recover missed inquiries', prompt: 'I run a service business. How could you help me find unanswered customer inquiries and prepare follow-ups without sending anything without approval?' },
  { eyebrow: '02 / INBOX', label: 'Take the busywork off my plate', prompt: 'Show me a realistic day where a digital employee sorts customer messages and prepares my morning priorities. What would still need my approval?' },
  { eyebrow: '03 / BOOKINGS', label: 'Handle appointment requests', prompt: 'Customers ask for appointments while I am working. Show me how MAXX could collect details, check availability after a calendar is connected, and ask before confirming.' },
  { eyebrow: '04 / CONTENT', label: 'Turn one job into a week of posts', prompt: 'I completed a customer job and have a few photos. How could MAXX turn this into a week of social media drafts and what would I approve first?' },
  { eyebrow: '05 / REVENUE', label: 'Spot deals going cold', prompt: 'Explain how a digital employee could flag leads that have gone quiet, prioritize follow-ups, and measure whether the workflow recovered real sales.' },
  { eyebrow: '06 / FIRST STEP', label: 'Find my first automation', prompt: 'Interview me to identify the single repetitive task in my business that is easiest to prove and most likely to save time or recover revenue.' },
];
const GUIDES = ["Start by listing inquiries from channels you already control. Group them by date, urgency, and whether they received a reply. MAXX could draft a personal follow-up for each unanswered inquiry. You review every message before sending. Proof: compare replies and booked jobs against the original unanswered list.","Begin with a daily summary: new inquiries, unanswered messages, today's bookings, and three priority decisions. MAXX could prepare the summary after the inbox and calendar are connected. You retain control over replies, scheduling changes, payments, and sensitive decisions.","MAXX could ask customers for the service, preferred date, location, and best contact method. Once your real calendar is connected and tested, it could suggest available times. It would not confirm an appointment until your rules and approval are satisfied. Proof: test a real booking and calendar readback.","Give MAXX the job photos and a short description. It could draft one useful case-study post, three customer tips, and two short captions. You verify the facts, images, permissions, and brand voice. Publish only after your approval. Proof: approved posts and their real publication receipts.","First, define a lead as 'cold' using a measurable rule, such as no response for seven days. With an authorized CRM connection MAXX could rank those deals, prepare follow-up drafts, and report outcomes. Avoid treating a draft as a sale. Proof: replies, appointments, and attributed paid jobs.","Let's identify one repetitive job. What type of business do you run, how many inquiries do you receive weekly, and which routine takes the most time? A useful first automation should be low-risk, measurable, reversible, and capable of recovering revenue or saving time within 30 days."];
const START = 'I’m MAXX. Pick a task below to see how a digital employee could help your business. This is a public demonstration, not a connection to your private data.';
export function MaxxDiffusionDemo() {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: START }]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [snapshots, setSnapshots] = useState(0);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [guided, setGuided] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  const locked = phase === 'connecting' || phase === 'refining';
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, draft, phase]);
  useEffect(() => () => abort.current?.abort(), []);

  function showGuided(i: number) {
    if (locked) return;
    setError(''); setDraft(''); setSnapshots(0); setPhase('ready'); setGuided(true);
    setMessages(prev => [...prev, {role:'user',content:PROMPTS[i].prompt}, {role:'assistant',content:'GUIDED EXAMPLE — NOT LIVE AI\\n\\n' + GUIDES[i]}]);
  }
  async function send(value: string) {
    const question = value.trim().slice(0, 900);
    if (!question || locked) return;
    setInput(''); setError(''); setDraft(''); setSnapshots(0); setPhase('connecting'); setGuided(false);
    const history = messages.filter((m) => m.content !== START).slice(-6);
    const next: Msg[] = [...history, { role: 'user', content: question }];
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    const controller = new AbortController();
    abort.current = controller;
    let finalText = '';
    let completed = false;
    try {
      const response = await fetch('/api/maxx/demo', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }), signal: controller.signal,
      });
      if (!response.ok) {
        const info = await response.json().catch(() => ({}));
        if (response.status === 503 && info.error === 'live_unavailable') {
          setPhase('offline');
          setError('Live Mercury is not connected. Use the guided example buttons for realistic sample workflows, or request a consultation. No generated answer was fabricated.');
        } else throw new Error('The model is unavailable at the moment. No action was taken.');
        return;
      }
      if (!response.body) throw new Error('The response did not provide a stream.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value: bytes } = await reader.read();
        if (done) break;
        buffer += decoder.decode(bytes, { stream: true }).replace(/\r\n/g, '\n');
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const eventBlock = buffer.slice(0, idx); buffer = buffer.slice(idx + 2);
          const data = eventBlock.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
          if (!data) continue;
          let evt: StreamEvent;
          try { evt = JSON.parse(data); } catch { continue; }
          if (evt.type === 'snapshot' && typeof evt.text === 'string') {
            // Genuine Mercury diffusion states replace the previous text, not append.
            setDraft(evt.text); setSnapshots(n => n + 1); setPhase('refining');
          } else if (evt.type === 'final' && typeof evt.text === 'string') {
            finalText = evt.text; completed = true;
          } else if (evt.type === 'error') throw new Error(evt.message || 'The stream was interrupted.');
        }
      }
      if (!completed || !finalText) throw new Error('The model did not complete its response.');
      setMessages(prev => [...prev, { role: 'assistant', content: finalText }]);
      setDraft(''); setPhase('ready');
    } catch (cause) {
      if (controller.signal.aborted) { setDraft(''); setPhase('idle'); return; }
      setDraft('');
      setError(cause instanceof Error ? cause.message : 'Something interrupted the response.');
      setPhase('error');
    } finally { if (abort.current === controller) abort.current = null; }
  }
  const cancel = () => { abort.current?.abort(); setDraft(''); setPhase('idle'); setError('Response cancelled. Nothing was executed.'); };
  const submit = (e: FormEvent) => { e.preventDefault(); void send(input); };
  return <section id="maxx-demo" className="maxx-demo section-pad" aria-labelledby="maxx-heading">
    <div className="maxx-intro">
      <div className="eyebrow"><span>02 /</span> MEET YOUR DIGITAL EMPLOYEE</div>
      <h2 id="maxx-heading">Meet MAXX.<br/><span className="highlight">Give it a job.</span></h2>
      <p>Don't start with a dashboard. Start with the problem. Pick a business challenge to explore a clearly labeled guided example, or type your own question for the live Mercury service when connected.</p>
      <div className="maxx-truth"><ShieldCheck size={18}/><span>Guided examples are authored scripts, not generated AI. No business data is connected, and no messages or tasks are executed.</span></div>
      <div className="maxx-prompt-grid" aria-label="Example tasks for MAXX">
        {PROMPTS.map((item) => <button key={item.eyebrow} type="button" disabled={locked} onClick={() => showGuided(PROMPTS.indexOf(item))} className="maxx-prompt">
          <small>{item.eyebrow}</small><strong>{item.label}</strong><ArrowUpRight size={19} aria-hidden="true"/>
        </button>)}
      </div>
    </div>
    <div className="maxx-console" aria-label="MAXX chat demonstration">
      <div className="maxx-console-head">
        <div className="maxx-avatar"><span>M</span><img src="https://raw.githubusercontent.com/executiveusa/macs-agent-portal/88d0a5d0595fd40a7dc60712fef2a7bc0c10e294/public/maxx/maxx-avatar.webp" alt="Agent MAXX character" loading="lazy" onError={e => {e.currentTarget.style.display = "none";}}/><i/></div>
        <div><strong>MAXX</strong><small>Digital Employee / Preview</small></div>
        <div className="maxx-model"><Sparkles size={13}/><span>{guided ? 'Scripted guide' : 'Mercury 3'}</span></div>
      </div>
      <div className="maxx-messages" role="log" aria-label="Conversation with MAXX">
        {messages.map((m, i) => <div className={'maxx-bubble ' + (m.role === 'user' ? 'maxx-user' : 'maxx-assistant')} key={i}>
          <small>{m.role === 'user' ? 'YOU' : 'MAXX'}</small>
          <p>{m.content}</p>
        </div>)}
        {phase === 'connecting' && <div className="maxx-thinking" role="status"><Loader2 size={15} className="maxx-spin"/> Connecting to Mercury…</div>}
        {phase === 'refining' && <div className="maxx-bubble maxx-assistant maxx-provisional">
          <small><span className="maxx-pulse"/> MAXX / REFINING · {snapshots} {snapshots === 1 ? 'SNAPSHOT' : 'SNAPSHOTS'}</small>
          <p>{draft}</p>
          <span className="maxx-provisional-note">Provisional response — changing live as Mercury refines it</span>
        </div>}
        {error && <div className="maxx-error" role="status"><WifiOff size={16}/>{error}</div>}
        <div ref={bottom}/>
      </div>
      <form onSubmit={submit} className="maxx-compose">
        <label htmlFor="maxx-input" className="maxx-sr-only">Ask MAXX a question</label>
        <input id="maxx-input" value={input} onChange={e => setInput(e.target.value)} maxLength={900} placeholder="What could MAXX do for your business?" disabled={locked}/>
        {locked ? <button type="button" onClick={cancel} aria-label="Stop generating"><Square size={17}/></button> : <button type="submit" disabled={!input.trim()} aria-label="Send question"><Send size={17}/></button>}
      </form>
      <div className="maxx-console-foot"><span><CheckCircle2 size={14}/> Final answers only. Provisional text cannot execute actions.</span><a href="https://macsdigitalmedia.vercel.app/apply" target="_blank" rel="noopener noreferrer">Plan your first task <ArrowRight size={14}/></a></div>
    </div>
  </section>;
}

# MACS Digital Employee — MAXX

A mobile-first Next.js 15 + Framer Motion customer-acquisition site for MACS Digital Media, featuring an interactive MAXX digital-employee preview.

## What ships

- Founder-friendly landing page, FAQ, owner-controlled approach and setup offer (from $1,950 USD; recurring fees need separate quotation)
- Six clickable, prewritten, clearly labeled **GUIDED EXAMPLES**: missed leads, busy inbox, appointment requests, content repurposing, cold deals, first automation
- MAXX character assets referenced from a pinned commit in the owner's public `macs-agent-portal` repo (never presented as a real customer screenshot)
- An optional **genuine Mercury 3 diffusion** API route with SSE full-snapshot replacement. No fake generated replies or model calls without configuration
- CTAs to the verified public MACS intake form: https://macsdigitalmedia.vercel.app/apply
- Responsive mobile chat with cancellation, streaming and error states; no actions/tools against customer accounts

## Run

```sh
npm install
npm run dev
npm run build
```

## Live model activation (gated, not activated by this delivery)

1. Obtain an Inception Labs API key in the owner's provider account; store only in Vercel encrypted server-side project settings as `INCEPTION_API_KEY`. Never commit it or expose it as a `NEXT_PUBLIC_` variable.
2. Configure **hard provider-side expenditure limits** and Vercel/edge rate limits for the public endpoint before enabling it.
3. Only after independent abuse, latency, and spend checks, set `MAXX_PUBLIC_DEMO_ENABLED=true` for the intended environment and redeploy.
4. Run a real authorized stream test proving multiple `diffusing:true` snapshot frames, final answer, abort, timeout, failures, and cost accounting. The provider endpoint is `https://api.inceptionlabs.ai/v1/chat/completions`; model `mercury-3`.
5. Do not display provisional snapshots as finalized or execute any requested action. This public demo has **no tools** and no customer database access.

When either server-side setting is absent, POST `/api/maxx/demo` returns HTTP 503 `live_unavailable`. The six guided examples still work. This is intentional, not a simulated AI connection.

## Boundaries and evidence

- MAXX's original authenticated/Hermes control plane is **not** connected to this public demonstration. No operational employee, voice receptionist, booking agent, or customer follow-up has been verified from this page.
- Prices, ongoing care, terms and scope must be confirmed by MACS before quoting a client.
- The intake webpage itself is reachable; form submission and lead-delivery receipts are not independently verified.
- Chat messages are local component state only; there is no chat persistence.
- The public route should **not** be activated with a provider key alone. It needs effective rate limits and a verified budget ceiling.
- Avatar/photo assets currently load from owner-controlled GitHub raw URLs; self-host optimized copies before final visual performance sign-off.
- Vercel READY + public HTTP 200 prove deployment, not a complete interactive or commercial walk test.

## Release governance

Working branch: `feat/maxx-diffusion-demo`. Base production revision: `15a3ecffd763a03681a9124b8df9bc04702fa251`. Rollback production by redeploying that commit if a promoted build causes regression.

Production release checklist:
- [ ] Verify exact GitHub branch SHA and successful Next.js build
- [ ] Browser-click every guided prompt at 320/390/430/desktop widths; check no horizontal overflow
- [ ] Confirm MAXX source image loads and has correct alt text
- [ ] Check the public `/apply` form delivers a real notification/CRM record with human approval
- [ ] Independently assess accessibility, usability, performance and rollback
- [ ] For live Mercury only: provider spending ceiling, edge rate limiting, valid key, real streaming frame capture and safe failure path
- [ ] Record final release approval; do not silently merge or replace the running production build

Reference for actual diffusion stream fixture: https://github.com/zbruceli/mercury3/blob/main/tests/fixtures/recordings/r0/mercury-3/diffusing.json (MIT project). No third-party UI dependencies were added.

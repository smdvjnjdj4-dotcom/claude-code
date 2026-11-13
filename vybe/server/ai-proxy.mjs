// VYBE AI proxy — a tiny backend that keeps your Anthropic API key on the server.
// The PWA calls POST /api/companion; this file is the only place that talks to the Claude API.
//
//   cd server && npm install
//   ANTHROPIC_API_KEY=... npm start            (listens on :8787; Vite dev server proxies /api to it)
//
import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.VYBE_MODEL ?? 'claude-opus-5-5';
const client = new Anthropic(); // reads ANTHROPIC_API_KEY (or another configured credential) from the environment

const ATTR = ['discipline', 'intelligence', 'fitness', 'finance', 'creativity', 'social'];
const Reply = z.object({
  text: z.string(),
  proposals: z.array(z.object({
    title: z.string(),
    attribute: z.enum(ATTR),
    difficulty: z.enum(['easy', 'normal', 'challenging', 'hard', 'epic']),
    recurrence: z.enum(['once', 'daily']),
  })),
});

const SYSTEM = `You are the VYBE Companion inside a gamified life app. You help the user plan days, break goals into small missions, reflect on progress and improve focus.
Be warm, concise and practical (max ~120 words). Never shame the user and never push unhealthy overwork — rest counts as progress.
Answer in the user's language (field "lang": de = German, en = English).
When it helps, propose up to 3 concrete missions in "proposals" (short imperative titles, <= 60 chars). Proposals are only suggestions; the user confirms them in the app. Otherwise return an empty array.
Difficulty guide: easy <=10 min, normal ~20 min, challenging ~40 min, hard ~60 min or physically demanding, epic = rare big effort.`;

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  if (req.url !== '/api/companion') return send(res, 404, { error: 'not_found' });
  if (req.method === 'GET') return send(res, 200, { ok: true });
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  try {
    const body = JSON.parse(await readBody(req));
    const history = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const messages = history
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
      .map((m) => ({ role: m.role, content: m.text.slice(0, 2000) }));
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length) return send(res, 400, { error: 'empty' });
    const context = JSON.stringify(body.context ?? {}).slice(0, 6000);

    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // Refusal fallback: if the model declines, the API retries on a suitable fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(Reply) },
      system: `${SYSTEM}\n\nUser context (from the app, JSON):\n${context}`,
      messages,
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return send(res, 200, { text: body.context?.lang === 'en' ? "I can't help with that one — let's focus on your next small step." : 'Dabei kann ich nicht helfen – lass uns auf deinen nächsten kleinen Schritt schauen.', proposals: [] });
    }
    return send(res, 200, response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'rate_limited' });
    if (err instanceof Anthropic.AuthenticationError) return send(res, 502, { error: 'auth' });
    if (err instanceof Anthropic.APIError) return send(res, 502, { error: `upstream_${err.status ?? 'error'}` });
    console.error('[vybe-ai-proxy]', err?.message ?? err);
    return send(res, 400, { error: 'bad_request' });
  }
});

server.listen(PORT, () => console.log(`VYBE AI proxy on http://localhost:${PORT}/api/companion (model ${MODEL})`));

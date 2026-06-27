import { ok } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Lightweight AI helper powered by Groq. POST { prompt, system? }.
 * Returns { data: { text }, fallback } — graceful, never throws to the client.
 * If no GROQ_API_KEY is configured, returns a clear, friendly placeholder so
 * the UI degrades cleanly.
 */
export async function POST(req: Request) {
  let prompt = '';
  let system = 'You are Zenith, a concise, knowledgeable astronomy guide. Answer clearly in 2-4 short paragraphs, no markdown headers.';
  try {
    const b = (await req.json()) as { prompt?: string; system?: string };
    prompt = (b.prompt || '').slice(0, 2000);
    if (b.system) system = b.system.slice(0, 800);
  } catch {
    /* empty body */
  }
  if (!prompt) return ok({ text: 'Ask me anything about the sky above you.' }, true);

  if (!GROQ_KEY) {
    return ok(
      { text: 'AI insights are ready to switch on — add your GROQ_API_KEY to .env.local and restart. (Until then, the rest of Zenith runs on live space data with no key required.)' },
      true,
    );
  }

  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 600,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    });
    clearTimeout(id);
    if (!r.ok) throw new Error(`Groq HTTP ${r.status}`);
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const text = j.choices?.[0]?.message?.content?.trim() || 'No response generated.';
    return ok({ text }, false);
  } catch {
    return ok({ text: 'The AI service is unavailable right now. Please try again in a moment.' }, true);
  }
}

import { timedFetch, ok } from '@/lib/proxy';
import { FALLBACK_CREW } from '@/data/fallbacks';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await timedFetch('http://api.open-notify.org/astros.json');
    const j = (await r.json()) as { number: number; people: { name: string; craft: string }[] };
    return ok({ number: j.number, people: j.people }, false);
  } catch {
    return ok(FALLBACK_CREW, true);
  }
}

import { timedFetch, ok } from '@/lib/proxy';
import { FALLBACK_LAUNCHES } from '@/data/fallbacks';

export const dynamic = 'force-dynamic';

interface LL2Result {
  name: string;
  net: string;
  pad?: { name?: string; location?: { name?: string } };
  rocket?: { configuration?: { name?: string } };
}

export async function GET() {
  try {
    const r = await timedFetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=4&hide_recent_previous=true');
    const j = (await r.json()) as { results: LL2Result[] };
    const data = j.results.map((x) => ({
      name: x.name,
      net: x.net,
      pad: [x.pad?.name, x.pad?.location?.name].filter(Boolean).join(', ') || 'TBD',
      rocket: x.rocket?.configuration?.name || '—',
    }));
    return ok(data, false);
  } catch {
    return ok(FALLBACK_LAUNCHES, true);
  }
}

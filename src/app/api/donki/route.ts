import { timedFetch, ok, NASA_KEY } from '@/lib/proxy';
import { FALLBACK_DONKI } from '@/data/fallbacks';

export const dynamic = 'force-dynamic';

interface Flare {
  classType?: string;
  beginTime?: string;
  sourceLocation?: string;
}

export async function GET() {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 864e5);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const r = await timedFetch(`https://api.nasa.gov/DONKI/FLR?startDate=${fmt(start)}&endDate=${fmt(end)}&api_key=${NASA_KEY}`);
    const j = (await r.json()) as Flare[];
    const data = (j || [])
      .slice(-3)
      .reverse()
      .map((f) => ({
        type: 'Solar Flare',
        class: f.classType || '—',
        time: f.beginTime || '',
        note: `Flare from ${f.sourceLocation || 'active region'}.`,
      }));
    return ok(data.length ? data : FALLBACK_DONKI, data.length === 0);
  } catch {
    return ok(FALLBACK_DONKI, true);
  }
}

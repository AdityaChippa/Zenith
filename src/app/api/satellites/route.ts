import { timedFetch, ok } from '@/lib/proxy';
import { FALLBACK_TLES, type TLE } from '@/data/fallbacks';

export const dynamic = 'force-dynamic';

const GROUPS: { group: TLE['group']; q: string }[] = [
  { group: 'station', q: 'stations' },
  { group: 'science', q: 'science' },
  { group: 'weather', q: 'weather' },
  { group: 'navigation', q: 'gnss' },
];

function parseTLE(text: string, group: TLE['group']): TLE[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: TLE[] = [];
  for (let i = 0; i + 2 < lines.length + 1; i += 3) {
    const name = lines[i];
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (l1?.startsWith('1 ') && l2?.startsWith('2 ')) {
      out.push({ name: name.trim(), group, line1: l1, line2: l2 });
    }
  }
  return out;
}

export async function GET() {
  try {
    const all: TLE[] = [];
    for (const g of GROUPS) {
      try {
        const r = await timedFetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g.q}&FORMAT=tle`, 4500);
        const txt = await r.text();
        all.push(...parseTLE(txt, g.group).slice(0, 18));
      } catch {
        /* skip this group */
      }
    }
    if (!all.length) return ok(FALLBACK_TLES, true);
    return ok(all.slice(0, 70), false);
  } catch {
    return ok(FALLBACK_TLES, true);
  }
}

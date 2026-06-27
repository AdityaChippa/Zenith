import { timedFetch, ok } from '@/lib/proxy';
import { FALLBACK_AURORA } from '@/data/fallbacks';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await timedFetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
    const j = (await r.json()) as { kp_index: number }[];
    const last = j[j.length - 1];
    const kp = Math.round(last?.kp_index ?? 0);
    const chance = Math.min(95, Math.max(2, Math.round(kp * 12)));
    return ok({ kp, chance }, false);
  } catch {
    return ok(FALLBACK_AURORA, true);
  }
}

import { timedFetch, ok } from '@/lib/proxy';
import { FALLBACK_ISS } from '@/data/fallbacks';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await timedFetch('https://api.wheretheiss.at/v1/satellites/25544');
    const j = (await r.json()) as { latitude: number; longitude: number; altitude: number; velocity: number };
    return ok({ lat: j.latitude, lon: j.longitude, alt: j.altitude, vel: j.velocity }, false);
  } catch {
    return ok(FALLBACK_ISS, true);
  }
}

import { timedFetch, ok, NASA_KEY } from '@/lib/proxy';
import { FALLBACK_NEO } from '@/data/fallbacks';

export const dynamic = 'force-dynamic';

interface NeoObj {
  name: string;
  estimated_diameter: { kilometers: { estimated_diameter_max: number } };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: {
    miss_distance: { kilometers: string };
    relative_velocity: { kilometers_per_second: string };
  }[];
}

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const r = await timedFetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_KEY}`);
    const j = (await r.json()) as { near_earth_objects: Record<string, NeoObj[]> };
    const flat = Object.values(j.near_earth_objects).flat();
    const data = flat
      .map((n) => ({
        name: n.name.replace(/[()]/g, ''),
        diameter: n.estimated_diameter.kilometers.estimated_diameter_max,
        miss: Number(n.close_approach_data[0]?.miss_distance.kilometers ?? 0),
        velocity: Number(n.close_approach_data[0]?.relative_velocity.kilometers_per_second ?? 0),
        hazardous: n.is_potentially_hazardous_asteroid,
      }))
      .sort((a, b) => a.miss - b.miss)
      .slice(0, 5);
    return ok(data.length ? data : FALLBACK_NEO, data.length === 0);
  } catch {
    return ok(FALLBACK_NEO, true);
  }
}

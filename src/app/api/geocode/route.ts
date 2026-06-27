import { timedFetch, ok } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

export interface GeoResult {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

/**
 * Dual-mode geocoder.
 *   ?q=<text>        → forward search (city autocomplete), returns { data: { results } }
 *   ?lat=&lon=       → reverse lookup (GPS / pin), returns { data: { label } }
 * Both sources are key-free (Open-Meteo + BigDataCloud) and fall back gracefully.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  // ── Forward search ────────────────────────────────────────────────────────
  if (q) {
    if (q.length < 2) return ok({ results: [] as GeoResult[] }, false);
    try {
      const r = await timedFetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
      );
      const j = (await r.json()) as {
        results?: { name: string; country_code?: string; latitude: number; longitude: number; admin1?: string }[];
      };
      const results: GeoResult[] = (j.results || []).map((x) => ({
        name: x.admin1 && x.admin1 !== x.name ? `${x.name}, ${x.admin1}` : x.name,
        country: x.country_code || '',
        lat: x.latitude,
        lon: x.longitude,
      }));
      return ok({ results }, false);
    } catch {
      return ok({ results: [] as GeoResult[] }, true);
    }
  }

  // ── Reverse lookup ────────────────────────────────────────────────────────
  const coordLabel = lat && lon ? `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}` : 'Unknown';
  try {
    const r = await timedFetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    const j = (await r.json()) as { city?: string; locality?: string; principalSubdivision?: string; countryName?: string };
    const label = [j.city || j.locality || j.principalSubdivision, j.countryName].filter(Boolean).join(', ') || coordLabel;
    return ok({ label }, false);
  } catch {
    return ok({ label: coordLabel }, true);
  }
}

import { timedFetch, ok, NASA_KEY } from '@/lib/proxy';
import { FALLBACK_APOD } from '@/data/fallbacks';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await timedFetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
    const j = (await r.json()) as {
      title: string;
      url: string;
      hdurl?: string;
      explanation: string;
      media_type: string;
      date: string;
    };
    return ok(
      { title: j.title, url: j.media_type === 'image' ? j.url : j.url, explanation: j.explanation, media_type: j.media_type, date: j.date },
      false,
    );
  } catch {
    return ok(FALLBACK_APOD, true);
  }
}

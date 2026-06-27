import { NextResponse } from "next/server";
import type { Tle } from "@/demo/engine/types";

export const runtime = "edge";

// Our filter buckets -> CelesTrak GP group names.
const BUCKETS: Record<string, string> = {
  station: "stations",
  starlink: "starlink",
  gps: "gps-ops",
  weather: "weather",
  science: "science",
};

const MAX_TOTAL = 900;

function parseTleText(text: string, bucket: string): Tle[] {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
  const out: Tle[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith("1 ") && lines[i + 1]?.startsWith("2 ")) {
      const name = (lines[i - 1] || "").replace(/^0 /, "").trim() || "UNKNOWN";
      out.push({ name, line1: lines[i], line2: lines[i + 1], group: bucket });
      i++; // skip line2
    }
  }
  return out;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = (url.searchParams.get("groups") || "station,starlink,gps,weather,science")
    .split(",")
    .map((g) => g.trim().toLowerCase())
    .filter((g) => g in BUCKETS);

  const buckets = requested.length ? requested : ["station"];
  const all: Tle[] = [];
  const errors: string[] = [];

  await Promise.all(
    buckets.map(async (bucket) => {
      const group = BUCKETS[bucket];
      const endpoint = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`;
      try {
        const res = await fetch(endpoint, {
          // cache at the edge; CelesTrak refreshes a few times per day
          next: { revalidate: 3600 },
          headers: { "User-Agent": "ProjectZenith/1.0 (+celestial-eye)" },
        });
        if (!res.ok) {
          errors.push(`${bucket}:${res.status}`);
          return;
        }
        const text = await res.text();
        all.push(...parseTleText(text, bucket));
      } catch (e) {
        errors.push(`${bucket}:fetch-error`);
      }
    }),
  );

  if (all.length === 0) {
    return NextResponse.json(
      { ok: false, source: "celestrak", errors, tles: [] },
      { status: 502 },
    );
  }

  // Keep stations (ISS) first, then cap the total payload.
  all.sort((a, b) => (a.group === "station" ? -1 : 0) - (b.group === "station" ? -1 : 0));
  const tles = all.slice(0, MAX_TOTAL);

  return NextResponse.json(
    { ok: true, source: "celestrak", count: tles.length, errors, tles },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

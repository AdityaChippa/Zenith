"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/demo/state/useStore";
import { CITIES, type City } from "@/demo/data/cities";

export default function LocationPicker() {
  const observer = useStore((s) => s.observer);
  const locationLabel = useStore((s) => s.locationLabel);
  const setObserver = useStore((s) => s.setObserver);
  const enterSky = useStore((s) => s.enterSky);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const debounce = useRef<number | null>(null);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const local = CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
    setResults(local);
    setOpen(true);

    // extend with live geocoding (best-effort)
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const json = (await res.json()) as { results?: City[]; data?: { results?: City[] } };
        const list = json.data?.results ?? json.results ?? [];
        if (list.length) {
          const merged = [...local];
          for (const r of list) {
            if (!merged.some((m) => m.name.toLowerCase() === r.name.toLowerCase())) {
              merged.push(r);
            }
          }
          setResults(merged.slice(0, 8));
        }
      } catch {
        /* keep local results */
      }
    }, 300) as unknown as number;
  }, [query]);

  const choose = (c: City) => {
    setObserver({ latDeg: c.lat, lonDeg: c.lon }, `${c.name}${c.country ? ", " + c.country : ""}`);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const useGps = () => {
    if (!navigator.geolocation) return;
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObserver(
          { latDeg: pos.coords.latitude, lonDeg: pos.coords.longitude },
          "My location",
        );
        setGeoBusy(false);
      },
      () => setGeoBusy(false),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 md:p-8">
      {/* hero */}
      <div className="max-w-xl">
        <div className="eyebrow mb-3">Project Zenith</div>
        <h1 className="font-dzdisplay text-5xl font-semibold leading-[0.95] tracking-tightest md:text-7xl">
          The Celestial Eye
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-dzmuted md:text-base">
          A real-time cosmic radar. Point anywhere on Earth and see exactly
          what is directly above you — the ISS, satellites, planets, the Sun and
          Moon, and the constellations — at true astronomical positions for your
          location and this instant.
        </p>
      </div>

      {/* control card */}
      <div className="pointer-events-auto mx-auto w-full max-w-md md:mx-0">
        <div className="panel p-4">
          <div className="eyebrow mb-3">What&rsquo;s directly above you?</div>

          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              placeholder="Search a city…"
              className="w-full rounded-md border border-dzhairline bg-black/30 px-3 py-2.5 text-sm
                         outline-none placeholder:text-dzmuted focus:border-dzsignal/50"
            />
            {open && results.length > 0 && (
              <ul className="panel-solid absolute z-20 mt-2 max-h-64 w-full overflow-auto p-1">
                {results.map((c, i) => (
                  <li key={`${c.name}-${i}`}>
                    <button
                      onClick={() => choose(c)}
                      className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-white/[0.06]"
                    >
                      <span>{c.name}</span>
                      <span className="num text-xs text-dzmuted">
                        {c.lat.toFixed(1)}, {c.lon.toFixed(1)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button onClick={useGps} className="btn flex-1" disabled={geoBusy}>
              {geoBusy ? "Locating…" : "Use my location"}
            </button>
            <span className="text-xs text-dzmuted">or tap the globe</span>
          </div>

          {observer && (
            <button
              onClick={enterSky}
              className="mt-4 flex w-full items-center justify-between rounded-md border border-dzsignal/40
                         bg-dzsignal/10 px-4 py-3 text-left transition-colors hover:bg-dzsignal/20"
            >
              <span>
                <span className="eyebrow block text-dzsignal/80">Reveal the sky above</span>
                <span className="font-dzdisplay text-lg">{locationLabel}</span>
              </span>
              <span className="text-dzsignal">→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useZenith } from '@/lib/store';

type SlotKey = 'iss' | 'crew' | 'apod' | 'aurora' | 'launches' | 'neo' | 'donki';

const ENDPOINTS: { key: SlotKey; url: string }[] = [
  { key: 'iss', url: '/api/iss' },
  { key: 'crew', url: '/api/crew' },
  { key: 'apod', url: '/api/apod' },
  { key: 'aurora', url: '/api/aurora' },
  { key: 'launches', url: '/api/launches' },
  { key: 'neo', url: '/api/neo' },
  { key: 'donki', url: '/api/donki' },
];

async function getJSON(url: string, ms = 11000): Promise<unknown> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return await r.json();
  } finally {
    clearTimeout(id);
  }
}

/** Fetch one endpoint with up to 2 attempts; returns parsed body or null. */
async function fetchSlot(url: string): Promise<{ data: unknown; fallback: boolean } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const j = (await getJSON(url)) as { data?: unknown; fallback?: boolean };
      if (j && j.data != null) return { data: j.data, fallback: !!j.fallback };
      // empty data — retry once
    } catch {
      // network/timeout (cold start) — retry once
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export function useBootstrap() {
  const setNow = useZenith((s) => s.setNow);
  const setProgress = useZenith((s) => s.setProgress);
  const setLocation = useZenith((s) => s.setLocation);
  const setSlot = useZenith((s) => s.setSlot);
  const setReducedMotion = useZenith((s) => s.setReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onMq);

    setNow(Date.now());
    const clock = setInterval(() => {
      const st = useZenith.getState();
      if (st.live) {
        setNow(Date.now());
      } else if (st.playSpeed) {
        const next = Math.max(-1440, Math.min(1440, st.scrubMinutes + st.playSpeed));
        st.setScrubMinutes(next);
        if (next <= -1440 || next >= 1440) st.setPlaySpeed(0);
      }
    }, 1000);

    const started = Date.now();
    const MIN_MS = 1600; // cinematic floor
    const HARD_CAP = 12000; // never hang the loader past this
    let settled = 0;
    const base = 8;
    const bump = () => {
      settled += 1;
      setProgress(Math.min(99, base + Math.round((settled / ENDPOINTS.length) * (100 - base))));
    };

    // Geolocation is DECOUPLED from the loader gate: default location shows
    // immediately; we upgrade it in the background when/if permission resolves.
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lon: longitude, label: 'Locating…' });
          try {
            const g = (await getJSON(`/api/geocode?lat=${latitude}&lon=${longitude}`)) as { data?: { label?: string } };
            setLocation({ lat: latitude, lon: longitude, label: g?.data?.label || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          } catch {
            setLocation({ lat: latitude, lon: longitude, label: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          }
        },
        () => {},
        { timeout: 8000, maximumAge: 600000 },
      );
    }

    // Mark all loading up front.
    ENDPOINTS.forEach(({ key }) => setSlot(key, { data: null, loading: true, fallback: false } as never));

    // Data endpoints with retry. Each populates its slot as soon as it resolves.
    const dataTasks = ENDPOINTS.map(({ key, url }) =>
      fetchSlot(url)
        .then((res) => {
          if (res) setSlot(key, { data: res.data as never, loading: false, fallback: res.fallback } as never);
          else setSlot(key, { data: null, loading: false, fallback: true } as never);
        })
        .finally(bump),
    );

    // Gate the reveal on data being ready — but never longer than HARD_CAP.
    const cap = new Promise<void>((r) => setTimeout(r, HARD_CAP));
    Promise.race([Promise.allSettled(dataTasks), cap]).then(async () => {
      const wait = Math.max(0, MIN_MS - (Date.now() - started));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      setProgress(100);
    });

    // Safety net: a few seconds after reveal, retry any slot that is still empty.
    const retry = setTimeout(() => {
      const st = useZenith.getState();
      ENDPOINTS.forEach(({ key, url }) => {
        if (st[key].data == null) {
          fetchSlot(url).then((res) => {
            if (res) useZenith.getState().setSlot(key, { data: res.data as never, loading: false, fallback: res.fallback } as never);
          });
        }
      });
    }, 7000);

    return () => {
      clearInterval(clock);
      clearTimeout(retry);
      mq.removeEventListener('change', onMq);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

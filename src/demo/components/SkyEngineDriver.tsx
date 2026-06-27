"use client";

import { useEffect, useRef } from "react";
import { useStore, effectiveDate } from "@/demo/state/useStore";
import { assembleSky, buildScene } from "@/demo/engine/zenith";
import type { Observer, SkyObject, Tle } from "@/demo/engine/types";

const ASSEMBLE_HZ = 5;
const ASSEMBLE_MS = 1000 / ASSEMBLE_HZ;

export default function SkyEngineDriver() {
  const tles = useStore((s) => s.tles);
  const workerRef = useRef<Worker | null>(null);
  const workerReady = useRef(false);
  const latestSats = useRef<SkyObject[]>([]);
  const useMainThread = useRef(false);

  // ---- one-time setup: reduced motion, share link, live TLEs ----
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    useStore.getState().setReducedMotion(mql.matches);

    // restore a shared sky from the URL: ?lat=..&lon=..&t=..&loc=..
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat") || "");
    const lon = parseFloat(params.get("lon") || "");
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const label = params.get("loc") || `${lat.toFixed(2)}\u00b0, ${lon.toFixed(2)}\u00b0`;
      useStore.getState().setObserver({ latDeg: lat, lonDeg: lon }, label);
      const t = parseInt(params.get("t") || "", 10);
      if (Number.isFinite(t) && t > 0) useStore.getState().setSimTime(t);
      useStore.getState().enterSky();
    }

    // fetch live TLEs (falls back to bundled snapshot on any failure)
    fetch("/api/tle")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { ok: boolean; tles: Tle[] }) => {
        if (data.ok && Array.isArray(data.tles) && data.tles.length > 0) {
          useStore.getState().setTles(data.tles, "live");
        }
      })
      .catch(() => {
        /* keep snapshot; UI shows "snapshot" badge */
      });
  }, []);

  // ---- worker lifecycle ----
  useEffect(() => {
    try {
      const worker = new Worker(
        new URL("../workers/propagator.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg?.type === "ready") {
          workerReady.current = true;
          useStore.getState().setSatReady(true);
        } else if (msg?.type === "positions") {
          latestSats.current = msg.sats as SkyObject[];
        }
      };
      worker.onerror = () => {
        useMainThread.current = true;
      };
      workerRef.current = worker;
    } catch {
      useMainThread.current = true;
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      workerReady.current = false;
    };
  }, []);

  // re-init worker whenever the TLE set changes
  useEffect(() => {
    workerReady.current = false;
    useStore.getState().setSatReady(false);
    workerRef.current?.postMessage({ type: "init", tles });
  }, [tles]);

  // ---- main loop ----
  useEffect(() => {
    let raf = 0;
    let lastReal = performance.now();
    let lastAssemble = 0;
    let lastTick = 0;

    const loop = () => {
      const now = performance.now();
      const dtReal = now - lastReal;
      lastReal = now;

      const st = useStore.getState();

      // advance simulated time without flipping the "following" flag
      let simMs: number;
      if (st.following) simMs = Date.now();
      else if (st.playing) simMs = st.simTimeMs + dtReal * st.timeScale;
      else simMs = st.simTimeMs;
      if (simMs !== st.simTimeMs) useStore.setState({ simTimeMs: simMs });

      const observer = st.observer;
      if (observer && now - lastAssemble > ASSEMBLE_MS) {
        lastAssemble = now;
        const date = effectiveDate({ simTimeMs: simMs, yearOffset: st.yearOffset });

        if (workerRef.current && workerReady.current && !useMainThread.current) {
          // worker path: compose bodies on main thread + worker satellites
          const scene = buildScene(date, observer, st.coneDeg, latestSats.current);
          useStore.getState().setScene(scene);
          if (now - lastTick > ASSEMBLE_MS) {
            lastTick = now;
            workerRef.current.postMessage({
              type: "tick",
              timeMs: date.getTime(),
              observer,
            });
          }
        } else {
          // fallback: propagate everything on the main thread
          const scene = assembleSky(date, observer, {
            coneDeg: st.coneDeg,
            tles: st.tles,
            maxSatellites: 1000,
          });
          useStore.getState().setScene(scene);
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}

// exported helper so the HUD can reuse the observer-setting pattern
export function asObserver(lat: number, lon: number): Observer {
  return { latDeg: lat, lonDeg: lon };
}

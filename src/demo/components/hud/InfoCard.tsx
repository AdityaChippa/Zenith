"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore, effectiveDate } from "@/demo/state/useStore";
import { parseTle, nextPass } from "@/demo/engine/satellites";
import type { NextPass, SkyObject } from "@/demo/engine/types";
import {
  compass,
  fmtCountdown,
  fmtDeg,
  fmtDuration,
  kindLabel,
} from "./format";

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="eyebrow">{label}</span>
      <span className={`num text-sm ${accent ? "text-dzsignal" : "text-dzink"}`}>{value}</span>
    </div>
  );
}

export default function InfoCard() {
  const selected = useStore((s) => s.selected);
  const scene = useStore((s) => s.scene);
  const observer = useStore((s) => s.observer);
  const tles = useStore((s) => s.tles);
  const select = useStore((s) => s.select);

  const [pass, setPass] = useState<NextPass | null>(null);
  const [passBusy, setPassBusy] = useState(false);
  const [noPass, setNoPass] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  // live version of the selected object (telemetry keeps updating)
  const live: SkyObject | null = useMemo(() => {
    if (!selected || !scene) return selected;
    const all = [scene.sun, scene.moon, ...scene.planets, ...scene.satellites];
    return all.find((o) => o.id === selected.id) ?? selected;
  }, [selected, scene]);

  useEffect(() => {
    setPass(null);
    setNoPass(false);
  }, [selected?.id]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!live) return null;

  const isSat = live.kind === "iss" || live.kind === "satellite";

  const computePass = () => {
    if (!observer) return;
    const tle = tles.find((t) => {
      const id = t.name.trim().replace(/\s+/g, "-").toLowerCase();
      const full = t.group ? `${t.group}:${id}` : id;
      return full === live.id || id === live.id;
    });
    if (!tle) {
      setNoPass(true);
      return;
    }
    const rec = parseTle(tle);
    if (!rec) {
      setNoPass(true);
      return;
    }
    setPassBusy(true);
    // defer so the spinner can paint
    setTimeout(() => {
      const p = nextPass(rec, observer, effectiveDate(useStore.getState()), 10, 24);
      setPass(p);
      setNoPass(!p);
      setPassBusy(false);
    }, 10);
  };

  return (
    <div className="panel w-[300px] max-w-[86vw] p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="eyebrow text-dzsignal/80">{kindLabel(live.kind)}</div>
          <h2 className="font-dzdisplay text-2xl leading-tight">{live.name}</h2>
        </div>
        <button
          onClick={() => select(null)}
          className="rounded-md border border-dzhairline px-2 py-1 text-xs text-dzmuted hover:text-dzink"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {live.overhead && (
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-dzsignal/40 bg-dzsignal/10 px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-dzsignal" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-dzsignal">
            Directly overhead
          </span>
        </div>
      )}

      <div className="mt-3 border-t border-dzhairline pt-2">
        <Row label="Elevation" value={fmtDeg(live.altDeg)} accent={live.overhead} />
        <Row label="Azimuth" value={`${fmtDeg(live.azDeg)} ${compass(live.azDeg)}`} />
        {typeof live.magnitude === "number" && (
          <Row label="Magnitude" value={live.magnitude.toFixed(2)} />
        )}
      </div>

      {live.moon && (
        <div className="mt-1 border-t border-dzhairline pt-2">
          <Row label="Phase" value={live.moon.phaseName} />
          <Row
            label="Illuminated"
            value={`${(live.moon.illumination * 100).toFixed(0)}%`}
          />
        </div>
      )}

      {isSat && live.sub && (
        <div className="mt-1 border-t border-dzhairline pt-2">
          <Row label="Orbit altitude" value={`${live.sub.altitudeKm.toFixed(0)} km`} />
          <Row label="Speed" value={`${live.sub.speedKmS.toFixed(2)} km/s`} accent />
          <Row label="Slant range" value={`${live.sub.rangeKm.toFixed(0)} km`} />
          <Row
            label="Sub-point"
            value={`${live.sub.latDeg.toFixed(1)}, ${live.sub.lonDeg.toFixed(1)}`}
          />
        </div>
      )}

      {isSat && (
        <div className="mt-3 border-t border-dzhairline pt-3">
          {!pass && !noPass && (
            <button onClick={computePass} className="btn w-full" disabled={passBusy}>
              {passBusy ? "Computing…" : "Next visible pass"}
            </button>
          )}
          {noPass && (
            <p className="text-xs text-dzmuted">
              No pass above 10° in the next 24 hours from here.
            </p>
          )}
          {pass && (
            <div>
              <div className="eyebrow mb-1 text-dzsignal/80">Next pass</div>
              <Row label="Starts in" value={fmtCountdown(pass.aos.getTime() - nowMs)} accent />
              <Row
                label="Rises"
                value={pass.aos.toLocaleTimeString([], { hour12: false })}
              />
              <Row label="Peak elevation" value={fmtDeg(pass.maxElevationDeg)} />
              <Row
                label="Peak direction"
                value={compass(pass.maxElevationAzDeg)}
              />
              <Row label="Duration" value={fmtDuration(pass.durationSec)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

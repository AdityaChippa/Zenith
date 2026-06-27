"use client";

import { useEffect, useState } from "react";
import { useStore, effectiveDate } from "@/demo/state/useStore";
import { parseTle, nextPass } from "@/demo/engine/satellites";
import { fmtClockUTC, fmtClockLocal, fmtDateLocal } from "./format";

const SCALES: { label: string; value: number }[] = [
  { label: "1×", value: 1 },
  { label: "1m/s", value: 60 },
  { label: "1h/s", value: 3600 },
  { label: "1d/s", value: 86400 },
];

export default function Timeline() {
  const playing = useStore((s) => s.playing);
  const following = useStore((s) => s.following);
  const timeScale = useStore((s) => s.timeScale);
  const yearOffset = useStore((s) => s.yearOffset);
  const togglePlay = useStore((s) => s.togglePlay);
  const goLive = useStore((s) => s.goLive);
  const setTimeScale = useStore((s) => s.setTimeScale);
  const setSimTime = useStore((s) => s.setSimTime);
  const setYearOffset = useStore((s) => s.setYearOffset);
  const select = useStore((s) => s.select);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  const date = effectiveDate(useStore.getState());
  const offsetH = (useStore.getState().simTimeMs - Date.now()) / 3_600_000;

  const onScrub = (h: number) => {
    setSimTime(Date.now() + h * 3_600_000);
  };

  const pickScale = (v: number) => {
    setTimeScale(v);
    useStore.setState({ playing: true });
  };

  const jumpToIss = () => {
    const st = useStore.getState();
    const tle = st.tles.find((t) => /ISS|ZARYA/i.test(t.name));
    if (!tle || !st.observer) return;
    const rec = parseTle(tle);
    if (!rec) return;
    const p = nextPass(rec, st.observer, new Date(), 10, 24);
    if (p) {
      setSimTime(p.aos.getTime() - 15_000);
      const iss = st.scene?.satellites.find((s) => /iss|zarya/i.test(s.id) || /ISS/.test(s.name));
      if (iss) select(iss);
    }
  };

  const machineYear = date.getUTCFullYear();

  return (
    <div className="panel px-4 py-3" data-tick={tick}>
      {/* clock + transport */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="mr-auto">
          <div className="num text-lg leading-none">{fmtClockUTC(date)}</div>
          <div className="num mt-0.5 text-[11px] text-dzmuted">
            {fmtDateLocal(date)} · {fmtClockLocal(date)} local
          </div>
        </div>

        <button
          onClick={goLive}
          className={`chip ${following ? "border-dzsignal/60 bg-dzsignal/15 text-dzsignal" : "text-dzmuted"}`}
        >
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                style={{ background: following ? "#4FE3C1" : "#6B7488" }} />
          Live
        </button>

        <button onClick={togglePlay} className="chip text-dzink" aria-label="Play/pause">
          {playing ? "❚❚" : "►"}
        </button>

        <div className="flex items-center gap-1">
          {SCALES.map((s) => (
            <button
              key={s.value}
              onClick={() => pickScale(s.value)}
              className={`chip ${
                !following && timeScale === s.value ? "border-dzsignal/60 text-dzsignal" : "text-dzmuted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button onClick={jumpToIss} className="chip text-dzember border-dzember/40 hover:bg-dzember/10">
          ⤳ Next ISS pass
        </button>
      </div>

      {/* scrub */}
      <div className="mt-3 flex items-center gap-3">
        <span className="eyebrow w-10 shrink-0">−24h</span>
        <input
          type="range"
          min={-24}
          max={24}
          step={0.05}
          value={Math.max(-24, Math.min(24, offsetH))}
          onChange={(e) => onScrub(parseFloat(e.target.value))}
          className="flex-1"
          aria-label="Scrub time"
        />
        <span className="eyebrow w-10 shrink-0 text-right">+24h</span>
      </div>

      {/* time machine */}
      <div className="mt-2 flex items-center gap-3 border-t border-dzhairline pt-2">
        <span className="eyebrow shrink-0 text-dzember/80">Time machine</span>
        <input
          type="range"
          min={-500}
          max={500}
          step={1}
          value={yearOffset}
          onChange={(e) => setYearOffset(parseInt(e.target.value, 10))}
          className="flex-1"
          aria-label="Precession years"
        />
        <span className="num w-24 shrink-0 text-right text-sm text-dzember">
          {yearOffset === 0 ? "present" : `year ${machineYear}`}
        </span>
        {yearOffset !== 0 && (
          <button onClick={() => setYearOffset(0)} className="chip text-dzmuted">
            reset
          </button>
        )}
      </div>
      {yearOffset !== 0 && (
        <p className="mt-1 font-mono text-[10px] text-dzmuted">
          Watching axial precession (~50″/yr, approximate). Satellites hidden across the jump.
        </p>
      )}
    </div>
  );
}

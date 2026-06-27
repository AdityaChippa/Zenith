"use client";

import { useEffect, useState } from "react";
import { useStore, SAT_GROUPS, type Layers, type SatGroup } from "@/demo/state/useStore";
import { compass } from "./format";
import { exportSkyPostcard } from "@/demo/lib/postcard";
import { startAmbient, stopAmbient } from "@/demo/lib/ambient";
import LocationPicker from "./LocationPicker";
import Timeline from "./Timeline";
import InfoCard from "./InfoCard";
import { demoBridge } from "@/demo/bridge";

const LAYER_LABELS: Record<keyof Layers, string> = {
  stars: "Stars",
  constellations: "Constellations",
  ecliptic: "Ecliptic",
  planets: "Planets",
  satellites: "Satellites",
  grid: "Alt-az grid",
  labels: "Labels",
};

function TopBar() {
  const locationLabel = useStore((s) => s.locationLabel);
  const observer = useStore((s) => s.observer);
  const tleSource = useStore((s) => s.tleSource);
  const satReady = useStore((s) => s.satReady);
  const scene = useStore((s) => s.scene);

  const satCount = scene?.satellites.length ?? 0;

  return (
    <div className="pointer-events-auto flex items-center gap-3">
      <button onClick={() => demoBridge.onExit?.()} className="btn flex items-center gap-2">
        <span className="text-dzsignal">←</span> Globe
      </button>
      <div className="panel px-4 py-2">
        <div className="eyebrow text-dzsignal/80">Observing from</div>
        <div className="font-dzdisplay text-lg leading-tight">{locationLabel || "—"}</div>
        {observer && (
          <div className="num text-[11px] text-dzmuted">
            {observer.latDeg.toFixed(3)}, {observer.lonDeg.toFixed(3)}
          </div>
        )}
      </div>
      <div className="panel hidden px-3 py-2 sm:block">
        <div className="eyebrow">Telemetry</div>
        <div className="num text-xs">
          <span className={tleSource === "live" ? "text-dzsignal" : "text-dzember"}>
            {tleSource === "live" ? "● LIVE" : "● SNAPSHOT"}
          </span>{" "}
          · {satReady ? satCount : "…"} sats
        </div>
      </div>
    </div>
  );
}

function Actions() {
  const scene = useStore((s) => s.scene);
  const locationLabel = useStore((s) => s.locationLabel);
  const observer = useStore((s) => s.observer);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sound) startAmbient();
    else stopAmbient();
    return () => stopAmbient();
  }, [sound]);

  const share = async () => {
    if (!observer) return;
    const st = useStore.getState();
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("lat", observer.latDeg.toFixed(4));
    url.searchParams.set("lon", observer.lonDeg.toFixed(4));
    url.searchParams.set("t", String(st.simTimeMs));
    if (locationLabel) url.searchParams.set("loc", locationLabel);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this shareable sky link:", url.toString());
    }
  };

  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <button
        onClick={() => scene && exportSkyPostcard(scene, locationLabel)}
        className="btn"
        title="Export a branded image of this sky"
      >
        Sky postcard
      </button>
      <button onClick={share} className="btn" title="Copy a shareable link to this exact sky">
        {copied ? "Link copied ✓" : "Share"}
      </button>
      <button
        onClick={toggleSound}
        className={`btn ${sound ? "border-dzsignal/50 text-dzsignal" : ""}`}
        title="Ambient sound"
      >
        {sound ? "Sound ◫" : "Sound"}
      </button>
    </div>
  );
}

function OverheadPanel() {
  const scene = useStore((s) => s.scene);
  const select = useStore((s) => s.select);
  const overhead = scene?.overhead ?? [];

  return (
    <div className="panel pointer-events-auto w-[260px] max-w-[80vw] p-4">
      <div className="flex items-baseline justify-between">
        <div className="eyebrow text-dzsignal/80">Directly overhead</div>
        <div className="num text-dzsignal">{overhead.length}</div>
      </div>
      {overhead.length === 0 ? (
        <p className="mt-2 text-xs text-dzmuted">
          Nothing in the zenith cone right now. Widen the cone or scrub time to
          catch a pass.
        </p>
      ) : (
        <ul className="mt-2 max-h-[182px] space-y-1 overflow-y-auto pr-1">
          {overhead.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => select(o)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-white/[0.06]"
              >
                <span className="truncate text-sm">{o.name}</span>
                <span className="num ml-2 shrink-0 text-xs text-dzmuted">
                  {o.altDeg.toFixed(0)}° {compass(o.azDeg)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LayersPanel() {
  const layers = useStore((s) => s.layers);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const satGroups = useStore((s) => s.satGroups);
  const toggleSatGroup = useStore((s) => s.toggleSatGroup);
  const coneDeg = useStore((s) => s.coneDeg);
  const setCone = useStore((s) => s.setCone);
  const [open, setOpen] = useState(true);

  return (
    <div className="panel pointer-events-auto w-[260px] max-w-[80vw] p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <span className="eyebrow">Layers</span>
        <span className="text-dzmuted">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {(Object.keys(LAYER_LABELS) as (keyof Layers)[]).map((k) => (
              <button
                key={k}
                onClick={() => toggleLayer(k)}
                className={`chip text-left ${
                  layers[k] ? "border-dzsignal/50 text-dzsignal" : "text-dzmuted"
                }`}
              >
                {LAYER_LABELS[k]}
              </button>
            ))}
          </div>

          {layers.satellites && (
            <div className="mt-3">
              <div className="eyebrow mb-1.5">Satellite groups</div>
              <div className="flex flex-wrap gap-1.5">
                {SAT_GROUPS.map((g: SatGroup) => (
                  <button
                    key={g}
                    onClick={() => toggleSatGroup(g)}
                    className={`chip ${
                      satGroups[g] ? "border-dzsignal/50 text-dzsignal" : "text-dzmuted"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 border-t border-dzhairline pt-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="eyebrow">Zenith cone</span>
              <span className="num text-sm text-dzsignal">±{coneDeg}°</span>
            </div>
            <input
              type="range"
              min={5}
              max={45}
              step={1}
              value={coneDeg}
              onChange={(e) => setCone(parseInt(e.target.value, 10))}
              className="w-full"
              aria-label="Zenith cone half-angle"
            />
          </div>
        </>
      )}
    </div>
  );
}

function SkyHud() {
  const selected = useStore((s) => s.selected);
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col p-4 md:p-5">
      {/* top */}
      <div className="flex items-start justify-between gap-3">
        <TopBar />
        <Actions />
      </div>

      {/* middle: left rail + right info card */}
      <div className="mt-3 flex flex-1 items-start justify-between gap-3 overflow-hidden">
        <div className="flex flex-col gap-3">
          <OverheadPanel />
          <LayersPanel />
        </div>
        <div className="pointer-events-auto ml-auto">{selected && <InfoCard />}</div>
      </div>

      {/* bottom timeline */}
      <div className="pointer-events-auto mt-3">
        <Timeline />
      </div>
    </div>
  );
}

export default function Hud() {
  const view = useStore((s) => s.view);
  return view === "globe" ? <LocationPicker /> : <SkyHud />;
}

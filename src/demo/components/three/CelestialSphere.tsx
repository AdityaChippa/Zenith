"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import starDataRaw from "@/demo/data/stars.json";
import constellationsRaw from "@/demo/data/constellations.json";
import { equatorialToHorizontal } from "@/demo/engine/astro";
import { eclipticTrace } from "@/demo/engine/astro";
import { lastRad, DEG } from "@/demo/engine/time";
import { precessEquatorial } from "@/demo/lib/precession";
import { bvToRgb, magToSize, magToIntensity } from "@/demo/lib/colors";
import { altAzToVec3, altAzToVec3Into } from "@/demo/lib/coords";
import { useStore, effectiveDate } from "@/demo/state/useStore";
import type { Observer } from "@/demo/engine/types";

export const DOME_R = 100;

interface StarData {
  stars: number[][]; // [raDeg, decDeg, mag, ci]
  names: Record<string, string>;
}
interface ConFigure {
  abbr: string;
  name: string;
  lines: [[number, number], [number, number]][];
  label: [number, number];
}

const starData = starDataRaw as unknown as StarData;
const constellations = constellationsRaw as unknown as ConFigure[];

// ---------------------------------------------------------------------------
// Star field
// ---------------------------------------------------------------------------
function StarField({ observer }: { observer: Observer }) {
  const pointsRef = useRef<THREE.Points>(null);
  const lastUpdate = useRef(0);
  const lastYear = useRef<number | null>(null);
  const precessed = useRef<number[][]>(starData.stars);

  const n = starData.stars.length;

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const [, , mag, ci] = starData.stars[i];
      const [r, g, b] = bvToRgb(ci);
      const intensity = magToIntensity(mag);
      colors[i * 3] = r * intensity;
      colors[i * 3 + 1] = g * intensity;
      colors[i * 3 + 2] = b * intensity;
      sizes[i] = 0;
    }
    return { positions, colors, sizes };
  }, [n]);

  const uniforms = useMemo(
    () => ({ uPixelRatio: { value: Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1) } }),
    [],
  );

  const recompute = (date: Date, years: number) => {
    const lst = lastRad(date, observer.lonDeg);
    const latRad = observer.latDeg * DEG;
    const geo = pointsRef.current?.geometry;
    if (!geo) return;
    const pos = geo.attributes.position.array as Float32Array;
    const siz = geo.attributes.size.array as Float32Array;

    // apply precession only when the year offset changes
    if (years !== lastYear.current) {
      if (years === 0) {
        precessed.current = starData.stars;
      } else {
        precessed.current = starData.stars.map(([ra, dec, mag, ci]) => {
          const p = precessEquatorial(ra, dec, years);
          return [p.raDeg, p.decDeg, mag, ci];
        });
      }
      lastYear.current = years;
    }
    const src = precessed.current;

    for (let i = 0; i < n; i++) {
      const ra = src[i][0];
      const dec = src[i][1];
      const mag = src[i][2];
      const { altDeg, azDeg } = equatorialToHorizontal(ra, dec, lst, latRad);
      if (altDeg < -2) {
        siz[i] = 0;
        continue;
      }
      const v = altAzToVec3(altDeg, azDeg, DOME_R);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
      // gentle horizon dimming
      const horizon = Math.min(1, Math.max(0.25, altDeg / 12 + 0.25));
      siz[i] = magToSize(mag, 2.4) * horizon;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.size.needsUpdate = true;
  };

  useEffect(() => {
    lastYear.current = null;
    lastUpdate.current = 0;
  }, [observer]);

  useFrame((_, delta) => {
    lastUpdate.current += delta;
    const st = useStore.getState();
    const years = st.yearOffset;
    if (lastUpdate.current > 0.25 || years !== lastYear.current) {
      lastUpdate.current = 0;
      recompute(effectiveDate(st), years);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          uniform float uPixelRatio;
          void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * uPixelRatio;
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            float core = smoothstep(0.5, 0.0, d);
            if (core < 0.02) discard;
            vec3 col = vColor * (0.55 + 0.9 * core);
            gl_FragColor = vec4(col, core);
          }
        `}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Constellation lines
// ---------------------------------------------------------------------------
function Constellations({ observer }: { observer: Observer }) {
  const ref = useRef<THREE.LineSegments>(null);
  const t = useRef(0);
  const segs = useMemo(() => {
    const all: [number, number][][] = [];
    for (const c of constellations) for (const seg of c.lines) all.push(seg);
    return all;
  }, []);
  const positions = useMemo(() => new Float32Array(segs.length * 2 * 3), [segs]);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const recompute = (date: Date) => {
    const lst = lastRad(date, observer.lonDeg);
    const latRad = observer.latDeg * DEG;
    const geo = ref.current?.geometry;
    if (!geo) return;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < segs.length; i++) {
      const [a, b] = segs[i];
      const ha = equatorialToHorizontal(a[0], a[1], lst, latRad);
      const hb = equatorialToHorizontal(b[0], b[1], lst, latRad);
      const hide = ha.altDeg < -3 && hb.altDeg < -3;
      const base = i * 6;
      if (hide) {
        for (let k = 0; k < 6; k++) pos[base + k] = 0;
        continue;
      }
      altAzToVec3Into(tmp, ha.altDeg, ha.azDeg, DOME_R);
      pos[base] = tmp.x;
      pos[base + 1] = tmp.y;
      pos[base + 2] = tmp.z;
      altAzToVec3Into(tmp, hb.altDeg, hb.azDeg, DOME_R);
      pos[base + 3] = tmp.x;
      pos[base + 4] = tmp.y;
      pos[base + 5] = tmp.z;
    }
    geo.attributes.position.needsUpdate = true;
  };

  useFrame((_, delta) => {
    t.current += delta;
    if (t.current > 0.4) {
      t.current = 0;
      recompute(effectiveDate(useStore.getState()));
    }
  });

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#4FE3C1"
        transparent
        opacity={0.22}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

// ---------------------------------------------------------------------------
// Constellation labels (DOM billboards, throttled)
// ---------------------------------------------------------------------------
function ConstellationLabels({ observer }: { observer: Observer }) {
  const [labels, setLabels] = useState<{ name: string; pos: THREE.Vector3 }[]>([]);

  useEffect(() => {
    let raf = 0;
    let stop = false;
    const tick = () => {
      if (stop) return;
      const date = effectiveDate(useStore.getState());
      const lst = lastRad(date, observer.lonDeg);
      const latRad = observer.latDeg * DEG;
      const out: { name: string; pos: THREE.Vector3 }[] = [];
      for (const c of constellations) {
        const h = equatorialToHorizontal(c.label[0], c.label[1], lst, latRad);
        if (h.altDeg > 8) {
          out.push({ name: c.name, pos: altAzToVec3(h.altDeg, h.azDeg, DOME_R * 0.98) });
        }
      }
      setLabels(out);
      raf = window.setTimeout(() => requestAnimationFrame(tick), 800) as unknown as number;
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(raf);
    };
  }, [observer]);

  return (
    <>
      {labels.map((l) => (
        <group key={l.name} position={l.pos}>
          <Html center distanceFactor={140} pointerEvents="none">
            <div className="select-none whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.25em] text-dzsignal/55">
              {l.name}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Ecliptic arc
// ---------------------------------------------------------------------------
function Ecliptic({ observer }: { observer: Observer }) {
  const ref = useRef<THREE.LineSegments>(null);
  const t = useRef(0);
  const steps = 96;
  // pairs of consecutive points -> 2 * steps vertices
  const positions = useMemo(() => new Float32Array(steps * 2 * 3), []);

  const recompute = (date: Date) => {
    const trace = eclipticTrace(date, observer, steps);
    const geo = ref.current?.geometry;
    if (!geo) return;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < steps; i++) {
      const a = altAzToVec3(trace[i].altDeg, trace[i].azDeg, DOME_R * 0.99);
      const b = altAzToVec3(trace[i + 1].altDeg, trace[i + 1].azDeg, DOME_R * 0.99);
      const base = i * 6;
      pos[base] = a.x;
      pos[base + 1] = a.y;
      pos[base + 2] = a.z;
      pos[base + 3] = b.x;
      pos[base + 4] = b.y;
      pos[base + 5] = b.z;
    }
    geo.attributes.position.needsUpdate = true;
  };

  useFrame((_, delta) => {
    t.current += delta;
    if (t.current > 0.5) {
      t.current = 0;
      recompute(effectiveDate(useStore.getState()));
    }
  });

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#FFB35C"
        transparent
        opacity={0.28}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

// ---------------------------------------------------------------------------
// Alt-az grid + horizon (fixed in the dome frame, computed once)
// ---------------------------------------------------------------------------
function GridAndHorizon({ showGrid }: { showGrid: boolean }) {
  const grid = useMemo(() => {
    const pts: number[] = [];
    // altitude circles every 30°
    for (let alt = 30; alt < 90; alt += 30) {
      let prev: THREE.Vector3 | null = null;
      for (let az = 0; az <= 360; az += 6) {
        const v = altAzToVec3(alt, az, DOME_R);
        if (prev) pts.push(prev.x, prev.y, prev.z, v.x, v.y, v.z);
        prev = v;
      }
    }
    // azimuth meridians every 30°
    for (let az = 0; az < 360; az += 30) {
      let prev: THREE.Vector3 | null = null;
      for (let alt = 0; alt <= 90; alt += 6) {
        const v = altAzToVec3(alt, az, DOME_R);
        if (prev) pts.push(prev.x, prev.y, prev.z, v.x, v.y, v.z);
        prev = v;
      }
    }
    return new Float32Array(pts);
  }, []);

  const horizon = useMemo(() => {
    const pts: number[] = [];
    let prev: THREE.Vector3 | null = null;
    for (let az = 0; az <= 360; az += 2) {
      const v = altAzToVec3(0, az, DOME_R);
      if (prev) pts.push(prev.x, prev.y, prev.z, v.x, v.y, v.z);
      prev = v;
    }
    return new Float32Array(pts);
  }, []);

  return (
    <>
      {showGrid && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[grid, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#6B7488" transparent opacity={0.12} depthWrite={false} />
        </lineSegments>
      )}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[horizon, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#4FE3C1" transparent opacity={0.25} depthWrite={false} />
      </lineSegments>
      {/* cardinal markers */}
      {[
        { d: "N", az: 0 },
        { d: "E", az: 90 },
        { d: "S", az: 180 },
        { d: "W", az: 270 },
      ].map((c) => (
        <group key={c.d} position={altAzToVec3(1.5, c.az, DOME_R * 0.99)}>
          <Html center distanceFactor={150} pointerEvents="none">
            <div className="font-mono text-xs tracking-[0.3em] text-dzink/70">{c.d}</div>
          </Html>
        </group>
      ))}
      {/* ground disc to occlude below-horizon */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <circleGeometry args={[DOME_R * 1.4, 64]} />
        <meshBasicMaterial color="#05060A" transparent opacity={0.92} />
      </mesh>
    </>
  );
}

export default function CelestialSphere() {
  const observer = useStore((s) => s.observer);
  const layers = useStore((s) => s.layers);
  if (!observer) return null;
  return (
    <group>
      {layers.stars && <StarField observer={observer} />}
      {layers.constellations && <Constellations observer={observer} />}
      {layers.constellations && layers.labels && <ConstellationLabels observer={observer} />}
      {layers.ecliptic && <Ecliptic observer={observer} />}
      <GridAndHorizon showGrid={layers.grid} />
    </group>
  );
}

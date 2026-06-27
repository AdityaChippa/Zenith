'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useZenith } from '@/lib/store';
import { computeBodies, makeObserver, starAltAz, compass } from '@/lib/astronomy';
import { STARS, CONSTELLATIONS, STAR_BY_ID } from '@/data/stars';
import { altAzToVec3, mulberry32, DEG } from '@/lib/scene';
import { lookAnglesAll, type SatLook } from '@/lib/satellites';
import { FALLBACK_TLES, GROUP_COLORS } from '@/data/fallbacks';
import { satIcon, issIcon } from '@/lib/icons';

const DOME_R = 60;

function dotSprite(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function SkyDome() {
  const location = useZenith((s) => s.location);
  const layers = useZenith((s) => s.layers);
  const satGroups = useZenith((s) => s.satGroups);
  const skyMode = useZenith((s) => s.skyMode);
  const naked = skyMode === 'naked';
  const select = useZenith((s) => s.select);
  const now = useZenith((s) => s.now);
  const scrub = useZenith((s) => s.scrubMinutes);
  const yearOff = useZenith((s) => s.yearOffset);
  const effectiveDate = useZenith((s) => s.effectiveDate);

  const sprite = useMemo(() => dotSprite(), []);
  const date = useMemo(() => effectiveDate(), [now, scrub, yearOff, effectiveDate]);
  const observer = useMemo(() => makeObserver(location.lat, location.lon), [location]);

  // Bright catalog stars → dome positions (only those above the horizon).
  const { positions, colors, sizes, visible } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const siz: number[] = [];
    const vis: Record<string, THREE.Vector3> = {};
    const c = new THREE.Color();
    for (const s of STARS) {
      const { altitude, azimuth } = starAltAz(s.ra, s.dec, date, observer);
      if (altitude < -2) continue;
      const v = altAzToVec3(altitude, azimuth, DOME_R);
      vis[s.id] = v;
      pos.push(v.x, v.y, v.z);
      c.set(s.color);
      col.push(c.r, c.g, c.b);
      siz.push(Math.max(1.4, 3.6 - s.mag));
    }
    return { positions: new Float32Array(pos), colors: new Float32Array(col), sizes: new Float32Array(siz), visible: vis };
  }, [date, observer]);

  // Ambient seeded faint field for depth.
  const faint = useMemo(() => {
    const rng = mulberry32(7);
    const pos: number[] = [];
    for (let i = 0; i < 1400; i++) {
      const alt = rng() * 90;
      const az = rng() * 360;
      const v = altAzToVec3(alt, az, DOME_R * (0.96 + rng() * 0.03));
      pos.push(v.x, v.y, v.z);
    }
    return new Float32Array(pos);
  }, []);

  // Constellation line segments between visible stars.
  const constLines = useMemo(() => {
    if (!layers.constellations) return [];
    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    for (const cst of CONSTELLATIONS) {
      for (const [a, b] of cst.lines) {
        const va = visible[a];
        const vb = visible[b];
        if (va && vb) segs.push([va, vb]);
      }
    }
    return segs;
  }, [visible, layers.constellations]);

  // Sun / Moon / planets.
  const bodies = useMemo(() => computeBodies(date, location.lat, location.lon).filter((b) => b.altitude > -3), [date, location]);

  const zenith = useMemo(() => altAzToVec3(89.9, 0, DOME_R), []);

  // Alt-az grid: altitude circles + azimuth meridians (demo-style).
  const gridLines = useMemo(() => {
    if (!layers.graticule) return [] as THREE.Vector3[][];
    const lines: THREE.Vector3[][] = [];
    for (const alt of [30, 60]) {
      const ring: THREE.Vector3[] = [];
      for (let az = 0; az <= 360; az += 6) ring.push(altAzToVec3(alt, az, DOME_R * 0.94));
      lines.push(ring);
    }
    for (let az = 0; az < 360; az += 45) {
      const mer: THREE.Vector3[] = [];
      for (let alt = 0; alt <= 90; alt += 6) mer.push(altAzToVec3(alt, az, DOME_R * 0.94));
      lines.push(mer);
    }
    return lines;
  }, [layers.graticule]);

  // Ecliptic — the Sun's path; approximate from the Sun's daily track of RA/Dec.
  const ecliptic = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let h = -12; h <= 12; h += 0.5) {
      const d = new Date(date.getTime() + h * 3600_000);
      const sun = computeBodies(d, location.lat, location.lon).find((b) => b.kind === 'sun');
      if (sun) pts.push(altAzToVec3(sun.altitude, sun.azimuth, DOME_R * 0.9));
    }
    return pts;
  }, [date, location]);

  // Constellation name labels at the centroid of their visible stars.
  const constLabels = useMemo(() => {
    if (!layers.constellations || !layers.starLabels) return [] as { name: string; pos: THREE.Vector3 }[];
    const out: { name: string; pos: THREE.Vector3 }[] = [];
    for (const cst of CONSTELLATIONS) {
      const ids = new Set<string>();
      cst.lines.forEach(([a, b]) => { ids.add(a); ids.add(b); });
      const vs = [...ids].map((id) => visible[id]).filter(Boolean) as THREE.Vector3[];
      if (vs.length < 2) continue;
      const c = new THREE.Vector3();
      vs.forEach((v) => c.add(v));
      c.multiplyScalar(1 / vs.length);
      out.push({ name: cst.name.toUpperCase(), pos: c });
    }
    return out;
  }, [visible, layers.constellations, layers.starLabels]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const pulse = 0.8 + Math.sin(clock.elapsedTime * 2) * 0.2;
      groupRef.current.scale.setScalar(pulse);
    }
  });

  const cardinals: { label: string; az: number }[] = [
    { label: 'N', az: 0 },
    { label: 'E', az: 90 },
    { label: 'S', az: 180 },
    { label: 'W', az: 270 },
  ];

  return (
    <group>
      {/* faint backdrop */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[faint, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.5} map={sprite} transparent opacity={0.5} color="#cfd8ec" sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* bright catalog stars */}
      {layers.stars && (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
          </bufferGeometry>
          <pointsMaterial size={1.4} map={sprite} vertexColors transparent sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      )}

      {/* alt-az grid */}
      {!naked && gridLines.map((pts, i) => (
        <Line key={`grid-${i}`} points={pts} color="#4DE0E6" lineWidth={1} transparent opacity={0.08} />
      ))}

      {/* ecliptic — the Sun's path */}
      {!naked && layers.ecliptic && ecliptic.length > 1 && <Line points={ecliptic} color="#FF8A3D" lineWidth={1} transparent opacity={0.28} dashed dashSize={1.2} gapSize={0.8} />}

      {/* constellation lines */}
      {constLines.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color="#4DE0E6" lineWidth={1} transparent opacity={0.22} />
      ))}

      {/* constellation labels */}
      {constLabels.map((c) => (
        <Html key={c.name} position={c.pos} center distanceFactor={42} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap font-mono text-[8px] tracking-[0.3em] text-cyan/50">{c.name}</div>
        </Html>
      ))}

      {/* satellites currently overhead (true alt/az) — instrument view only */}
      {!naked && <DomeSats date={date} lat={location.lat} lon={location.lon} layers={layers} satGroups={satGroups} select={select} />}

      {/* Sun / Moon / planets */}
      {layers.planets && bodies.map((b) => {
        const v = altAzToVec3(b.altitude, b.azimuth, DOME_R * 0.92);
        const r = b.kind === 'sun' ? 2.4 : b.kind === 'moon' ? 1.8 : 0.8;
        return (
          <group key={b.name} position={v}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                select({
                  kind: 'planet',
                  name: b.name,
                  lines: [
                    { label: 'Altitude', value: `${b.altitude.toFixed(1)}°` },
                    { label: 'Azimuth', value: `${b.azimuth.toFixed(1)}°` },
                    { label: 'Magnitude', value: b.magnitude.toFixed(2) },
                    ...(b.phase !== undefined ? [{ label: 'Illumination', value: `${(b.phase * 100).toFixed(0)}%` }] : []),
                  ],
                });
              }}
            >
              <sphereGeometry args={[r, 20, 20]} />
              <meshBasicMaterial color={b.color} />
            </mesh>
            {(b.kind === 'sun' || b.kind === 'moon') && (
              <mesh>
                <sphereGeometry args={[r * 1.6, 20, 20]} />
                <meshBasicMaterial color={b.color} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
              </mesh>
            )}
            {layers.starLabels && (
              <Html center distanceFactor={26} style={{ pointerEvents: 'none' }}>
                <div className="font-mono text-[9px] tracking-widest text-slate/90">{b.name.toUpperCase()}</div>
              </Html>
            )}
          </group>
        );
      })}

      {/* bright star labels */}
      {layers.starLabels &&
        STARS.filter((s) => s.mag < 1.0 && visible[s.id]).map((s) => (
          <Html key={s.id} position={visible[s.id]} center distanceFactor={30} style={{ pointerEvents: 'none' }}>
            <div className="font-mono text-[8px] tracking-widest text-starlight/70">{s.name}</div>
          </Html>
        ))}

      {/* zenith marker — straight up */}
      <group ref={groupRef} position={zenith}>
        <mesh>
          <ringGeometry args={[1.2, 1.6, 32]} />
          <meshBasicMaterial color="#FFB35C" transparent opacity={0.9} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <Html center distanceFactor={30} style={{ pointerEvents: 'none' }}>
          <div className="font-mono text-[9px] tracking-widest text-ember whitespace-nowrap">ZENITH ↑</div>
        </Html>
      </group>

      {/* horizon ring + cardinals */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[DOME_R * 0.985, DOME_R * 0.995, 96]} />
        <meshBasicMaterial color="#7C8AA5" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      {cardinals.map((c) => (
        <Html key={c.label} position={altAzToVec3(2, c.az, DOME_R * 0.97)} center distanceFactor={34} style={{ pointerEvents: 'none' }}>
          <div className="font-mono text-[11px] font-medium tracking-widest text-slate">{c.label}</div>
        </Html>
      ))}
    </group>
  );
}

// ── Satellites projected onto the local sky dome at true alt/az ──────────────
function DomeSat({ look, dome, onSelect }: { look: SatLook; dome: number; onSelect: () => void }) {
  const isISS = look.name.includes('ISS');
  const ref = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => (isISS ? issIcon() : satIcon(GROUP_COLORS[look.group])), [isISS, look.group]);
  const base = isISS ? 7 : 3.4;
  const [hovered, setHovered] = useState(false);
  const pos = useMemo(() => altAzToVec3(look.alt, look.az, dome), [look.alt, look.az, dome]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const want = base * (hovered ? 1.35 : 1) * (isISS ? 1 + Math.sin(clock.elapsedTime * 2.5) * 0.06 : 1);
    ref.current.scale.setScalar(ref.current.scale.x + (want - ref.current.scale.x) * 0.2);
  });
  return (
    <group position={pos}>
      <sprite
        ref={ref}
        scale={base}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
      </sprite>
      {hovered && (
        <Html center distanceFactor={30} position={[0, base * 0.5, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[8px] tracking-widest backdrop-blur-md ${isISS ? 'border-ember/50 bg-ember/15 text-ember' : 'border-white/15 bg-ink/80 text-starlight'}`}>{look.name} · {look.alt.toFixed(0)}°</div>
        </Html>
      )}
    </group>
  );
}

function DomeSats({
  date,
  lat,
  lon,
  layers,
  satGroups,
  select,
}: {
  date: Date;
  lat: number;
  lon: number;
  layers: { satellites: boolean; iss: boolean };
  satGroups: Record<string, boolean>;
  select: (s: { kind: 'satellite' | 'iss'; name: string; lines: { label: string; value: string }[] } | null) => void;
}) {
  const looks = useMemo(() => lookAnglesAll(FALLBACK_TLES, date, lat, lon), [date, lat, lon]);
  return (
    <group>
      {looks.map((s) => {
        const isISS = s.name.includes('ISS');
        if (isISS && !layers.iss) return null;
        if (!isISS && !layers.satellites) return null;
        if (satGroups[s.group] === false) return null;
        return (
          <DomeSat
            key={s.name}
            look={s}
            dome={52}
            onSelect={() =>
              select({
                kind: isISS ? 'iss' : 'satellite',
                name: s.name,
                lines: [
                  { label: 'Elevation', value: `${s.alt.toFixed(1)}°` },
                  { label: 'Azimuth', value: `${s.az.toFixed(1)}° ${compass(s.az)}` },
                  { label: 'Orbit altitude', value: `${s.orbitAlt.toFixed(0)} km` },
                  { label: 'Speed', value: `${s.velocity.toFixed(2)} km/s` },
                  { label: 'Slant range', value: `${s.range.toFixed(0)} km` },
                  { label: 'Sub-point', value: `${s.subLat.toFixed(1)}, ${s.subLon.toFixed(1)}` },
                  { label: 'Group', value: s.group },
                ],
              })
            }
          />
        );
      })}
    </group>
  );
}

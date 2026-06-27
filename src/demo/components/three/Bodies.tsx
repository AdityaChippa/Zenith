"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";

import { useStore, effectiveDate } from "@/demo/state/useStore";
import { altAzToVec3 } from "@/demo/lib/coords";
import { parseTle, propagateSat } from "@/demo/engine/satellites";
import type { SkyObject } from "@/demo/engine/types";
import { DOME_R } from "./CelestialSphere";

const BODY_R = DOME_R * 0.96;
const SAT_R = DOME_R * 0.9;

const PLANET_COLORS: Record<string, string> = {
  mercury: "#b8b0a6",
  venus: "#f5e8c8",
  mars: "#ff7849",
  jupiter: "#e7c9a0",
  saturn: "#e9d9a8",
  uranus: "#a8e6e0",
  neptune: "#7aa0ff",
};

const GROUP_COLORS: Record<string, string> = {
  station: "#4FE3C1",
  starlink: "#9ad0ff",
  gps: "#c8b3ff",
  weather: "#ffd27a",
  science: "#a0ffc0",
  default: "#cdd6e6",
};

// A small satellite glyph (body + two solar panels + soft glow), white on
// transparent — tinted per group via vertex colours. Turns the point sprites
// and the ISS marker into recognisable icons instead of squares.
let _satTex: THREE.CanvasTexture | null = null;
let _satTexTried = false;
function satTexture(): THREE.CanvasTexture | null {
  if (_satTexTried) return _satTex;
  _satTexTried = true;
  try {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const x = c.getContext("2d");
    if (!x) return null;
    x.translate(32, 32);
    x.fillStyle = "#ffffff";
    x.fillRect(-23, -6, 15, 12); // left solar panel
    x.fillRect(8, -6, 15, 12); // right solar panel
    x.fillRect(-8, -2, 16, 4); // strut
    x.beginPath();
    const xx = x as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void };
    if (typeof xx.roundRect === "function") xx.roundRect(-6, -8, 12, 16, 3);
    else x.rect(-6, -8, 12, 16);
    x.fill(); // body
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    _satTex = t;
  } catch {
    _satTex = null;
  }
  return _satTex;
}

// soft radial disc shader
function discMaterial(color: string, halo = 1.0) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uHalo: { value: halo },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uHalo;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        if (d > 1.0) discard;
        float core = smoothstep(0.55, 0.0, d);
        float halo = smoothstep(1.0, 0.0, d) * uHalo;
        float a = clamp(core + halo * 0.5, 0.0, 1.0);
        vec3 col = uColor * (0.6 + 1.1 * core);
        gl_FragColor = vec4(col, a);
      }
    `,
  });
}

function BodyDisc({
  obj,
  size,
  color,
  halo = 1,
}: {
  obj: SkyObject;
  size: number;
  color: string;
  halo?: number;
}) {
  const select = useStore((s) => s.select);
  const mat = useMemo(() => discMaterial(color, halo), [color, halo]);
  const pos = altAzToVec3(obj.altDeg, obj.azDeg, BODY_R);
  if (obj.altDeg < -2) return null;
  return (
    <Billboard position={pos}>
      <mesh
        material={mat}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          select(obj);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <planeGeometry args={[size * 2.6, size * 2.6]} />
      </mesh>
    </Billboard>
  );
}

function Moon({ obj }: { obj: SkyObject }) {
  const select = useStore((s) => s.select);
  const illum = obj.moon?.illumination ?? 0.5;
  const waxing = (obj.moon?.phaseDeg ?? 0) < 180 ? 1 : 0;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uIllum: { value: illum },
          uWaxing: { value: waxing },
        },
        vertexShader: `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uIllum;
          uniform float uWaxing;
          void main(){
            vec2 p = (vUv - 0.5) * 2.0;
            float r = length(p);
            if (r > 1.0) discard;
            float tx = sqrt(max(0.0, 1.0 - p.y*p.y)) * (1.0 - 2.0*uIllum);
            bool lit = (uWaxing > 0.5) ? (p.x > tx) : (p.x < -tx);
            float edge = smoothstep(1.0, 0.92, r);
            vec3 litCol = vec3(0.86, 0.88, 0.93);
            vec3 darkCol = vec3(0.06, 0.07, 0.10);
            vec3 col = lit ? litCol : darkCol;
            float a = lit ? edge : edge * 0.5;
            gl_FragColor = vec4(col, a);
          }
        `,
      }),
    [illum, waxing],
  );
  const pos = altAzToVec3(obj.altDeg, obj.azDeg, BODY_R);
  if (obj.altDeg < -2) return null;
  return (
    <Billboard position={pos}>
      <mesh
        material={mat}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          select(obj);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <planeGeometry args={[5.5, 5.5]} />
      </mesh>
    </Billboard>
  );
}

function SunMoonPlanets() {
  const scene = useStore((s) => s.scene);
  const showPlanets = useStore((s) => s.layers.planets);
  if (!scene) return null;
  return (
    <group>
      <BodyDisc obj={scene.sun} size={4.2} color="#FFD9A0" halo={2.2} />
      <Moon obj={scene.moon} />
      {showPlanets &&
        scene.planets.map((p) => (
          <BodyDisc
            key={p.id}
            obj={p}
            size={1.1}
            color={PLANET_COLORS[p.id] ?? "#cdd6e6"}
            halo={0.8}
          />
        ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Satellite layer as a point cloud (scales to many objects)
// ---------------------------------------------------------------------------
function Satellites() {
  const scene = useStore((s) => s.scene);
  const satGroups = useStore((s) => s.satGroups);
  const select = useStore((s) => s.select);
  const pointsRef = useRef<THREE.Points>(null);
  const tex = useMemo(() => satTexture(), []);

  // everything except the ISS (drawn larger, separately)
  const visible = useMemo(() => {
    if (!scene) return [] as SkyObject[];
    return scene.satellites.filter((s) => {
      if (s.altDeg < 0) return false;
      if (s.kind === "iss") return false;
      const g = s.id.split(":")[0];
      if (g in satGroups) return (satGroups as Record<string, boolean>)[g];
      return true;
    });
  }, [scene, satGroups]);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(visible.length * 3);
    const colors = new Float32Array(visible.length * 3);
    visible.forEach((s, i) => {
      const v = altAzToVec3(s.altDeg, s.azDeg, SAT_R);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      const g = s.id.split(":")[0];
      const c = new THREE.Color(GROUP_COLORS[g] ?? GROUP_COLORS.default);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });
    return { positions, colors };
  }, [visible]);

  if (visible.length === 0) return null;

  return (
    <points
      ref={pointsRef}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.index != null && visible[e.index]) select(visible[e.index]);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={tex ? 5 : 2.8}
        map={tex ?? undefined}
        alphaTest={tex ? 0.04 : 0}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={tex ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </points>
  );
}

// The ISS gets a larger, brighter billboard icon so it stands out.
function IssMarkers() {
  const scene = useStore((s) => s.scene);
  const satGroups = useStore((s) => s.satGroups);
  const select = useStore((s) => s.select);
  const tex = useMemo(() => satTexture(), []);

  const issList = useMemo(() => {
    if (!scene) return [] as SkyObject[];
    return scene.satellites.filter((s) => s.kind === "iss" && s.altDeg >= 0);
  }, [scene]);

  if (satGroups.station === false || issList.length === 0) return null;

  return (
    <group>
      {issList.map((iss) => {
        const pos = altAzToVec3(iss.altDeg, iss.azDeg, SAT_R);
        return (
          <Billboard key={iss.id} position={pos}>
            <mesh
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                select(iss);
              }}
              onPointerOver={() => (document.body.style.cursor = "pointer")}
              onPointerOut={() => (document.body.style.cursor = "auto")}
            >
              <planeGeometry args={[11, 11]} />
              <meshBasicMaterial map={tex ?? undefined} color="#ffffff" transparent alphaTest={tex ? 0.04 : 0} depthWrite={false} />
            </mesh>
            <Html center distanceFactor={150} pointerEvents="none" position={[0, -6, 0]}>
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-dzsignal">ISS</div>
            </Html>
          </Billboard>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Orbit trail for the selected satellite
// ---------------------------------------------------------------------------
function SelectedTrail() {
  const selected = useStore((s) => s.selected);
  const observer = useStore((s) => s.observer);
  const tles = useStore((s) => s.tles);
  const ref = useRef<THREE.LineSegments>(null);
  const markerRef = useRef<THREE.Group>(null);

  const trail = useMemo(() => {
    if (!selected || !observer) return null;
    if (selected.kind !== "iss" && selected.kind !== "satellite") return null;
    const tle = tles.find((t) => {
      const id = t.name.trim().replace(/\s+/g, "-").toLowerCase();
      const full = t.group ? `${t.group}:${id}` : id;
      return full === selected.id || id === selected.id;
    });
    if (!tle) return null;
    const rec = parseTle(tle);
    if (!rec) return null;

    const base = effectiveDate(useStore.getState()).getTime();
    const pts: THREE.Vector3[] = [];
    for (let dt = -3000; dt <= 3000; dt += 25) {
      const s = propagateSat(rec, new Date(base + dt * 1000), observer);
      if (!s) {
        pts.push(new THREE.Vector3(NaN, NaN, NaN));
        continue;
      }
      pts.push(
        s.altDeg > -1
          ? altAzToVec3(s.altDeg, s.azDeg, SAT_R)
          : new THREE.Vector3(NaN, NaN, NaN),
      );
    }
    const seg: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (isNaN(a.x) || isNaN(b.x)) continue;
      seg.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    return new Float32Array(seg);
  }, [selected, observer, tles]);

  if (!trail || trail.length === 0) return null;

  return (
    <group ref={markerRef}>
      <lineSegments ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trail, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#4FE3C1"
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Zenith cone reticle
// ---------------------------------------------------------------------------
function ZenithCone() {
  const coneDeg = useStore((s) => s.coneDeg);
  const ringRef = useRef<THREE.LineSegments>(null);

  const ring = useMemo(() => {
    const alt = 90 - coneDeg;
    const pts: number[] = [];
    let prev: THREE.Vector3 | null = null;
    for (let az = 0; az <= 360; az += 3) {
      const v = altAzToVec3(alt, az, DOME_R * 0.97);
      if (prev) pts.push(prev.x, prev.y, prev.z, v.x, v.y, v.z);
      prev = v;
    }
    return new Float32Array(pts);
  }, [coneDeg]);

  useFrame(({ clock }) => {
    const m = ringRef.current?.material as THREE.LineBasicMaterial | undefined;
    if (m) m.opacity = 0.35 + 0.2 * Math.sin(clock.elapsedTime * 1.6);
  });

  return (
    <group>
      <lineSegments ref={ringRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ring, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#4FE3C1"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      <group position={altAzToVec3(89.5, 0, DOME_R * 0.97)}>
        <Html center distanceFactor={150} pointerEvents="none">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-dzsignal/70">
            zenith
          </div>
        </Html>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Signature: the zenith beam — an ember lance from the pin up into space
// ---------------------------------------------------------------------------
function ZenithBeam() {
  const reducedMotion = useStore((s) => s.reducedMotion);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color("#FFB35C") },
        },
        vertexShader: `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTime;
          uniform vec3 uColor;
          void main(){
            // vUv.x across the cylinder, vUv.y up the height
            float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;   // bright at centre seam
            float radial = pow(edge, 2.5);
            float fade = pow(1.0 - vUv.y, 1.6);           // taper toward space
            float streak = 0.6 + 0.4 * sin(vUv.y * 40.0 - uTime * 3.0);
            float a = radial * fade * streak * 0.7;
            gl_FragColor = vec4(uColor * (1.0 + radial), a);
          }
        `,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!reducedMotion) {
      material.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  const height = DOME_R * 0.99;
  return (
    <group position={[0, height / 2, 0]}>
      <mesh material={material}>
        <cylinderGeometry args={[2.2, 0.6, height, 24, 1, true]} />
      </mesh>
      {/* base bloom */}
      <mesh position={[0, -height / 2 + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 4.5, 32]} />
        <meshBasicMaterial
          color="#FFB35C"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export default function Bodies() {
  const showSats = useStore((s) => s.layers.satellites);
  const yearOffset = useStore((s) => s.yearOffset);
  // satellites are meaningless across the time-machine's decade jumps
  const satsActive = showSats && yearOffset === 0;
  return (
    <group>
      <ZenithBeam />
      <ZenithCone />
      <SunMoonPlanets />
      {satsActive && <Satellites />}
      {satsActive && <IssMarkers />}
      {satsActive && <SelectedTrail />}
    </group>
  );
}

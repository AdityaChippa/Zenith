'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useZenith } from '@/lib/store';
import { subSolarPoint } from '@/lib/astronomy';
import { propagateAll, track, type SatState } from '@/lib/satellites';
import { FALLBACK_TLES, GROUP_COLORS, type TLE } from '@/data/fallbacks';
import { EARTH_RADIUS, latLonToVec3, satToVec3, vec3ToLatLon } from '@/lib/scene';
import { satIcon, issIcon } from '@/lib/icons';

const TEX = '/textures/earth/';

const dayVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const dayFrag = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform vec3 sunDir;
  uniform vec3 ember;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec3 N = normalize(vNormalW);
    float sun = dot(N, normalize(sunDir));
    float dayAmt = smoothstep(-0.12, 0.30, sun);

    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    float ocean = texture2D(specMap, vUv).r;

    // City lights only on the dark side, gently boosted.
    vec3 lights = night * (1.0 - dayAmt) * 1.6;

    // Ocean sun-glint on the day side.
    vec3 H = normalize(normalize(sunDir) + vViewDir);
    float spec = pow(max(dot(N, H), 0.0), 64.0) * ocean * dayAmt;

    vec3 base = day * (0.05 + 0.95 * dayAmt) + lights;
    base += vec3(1.0, 0.85, 0.6) * spec * 0.7;

    // Warm terminator bloom — the signature warm/cold tension at the day edge.
    float term = (1.0 - abs(sun)) * dayAmt;
    base += ember * term * 0.18;

    // Fresnel atmosphere rim.
    float fres = pow(1.0 - max(dot(N, vViewDir), 0.0), 3.0);
    vec3 atmo = mix(vec3(0.25, 0.45, 0.95), ember, term) * fres;
    base += atmo * 0.6;

    gl_FragColor = vec4(base, 1.0);
  }
`;

const atmoVert = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const atmoFrag = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    float fres = pow(1.0 - max(dot(normalize(vNormalW), vViewDir), 0.0), 2.4);
    vec3 col = vec3(0.30, 0.55, 1.0);
    gl_FragColor = vec4(col, fres * 0.9);
  }
`;

function useEarthTextures() {
  const [day, night, clouds, spec] = useLoader(THREE.TextureLoader, [
    `${TEX}earth_atmos_2048.jpg`,
    `${TEX}earth_lights_2048.png`,
    `${TEX}earth_clouds_1024.png`,
    `${TEX}earth_specular_2048.jpg`,
  ]);
  useMemo(() => {
    [day, night].forEach((t) => (t.colorSpace = THREE.SRGBColorSpace));
    [day, night, clouds, spec].forEach((t) => {
      t.anisotropy = 8;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    });
  }, [day, night, clouds, spec]);
  return { day, night, clouds, spec };
}

/** The warm volumetric lance from the pinned location into space — the signature mark. */
function ZenithBeam({ position }: { position: THREE.Vector3 }) {
  const ref = useRef<THREE.Group>(null);
  const dir = position.clone().normalize();
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [dir]);
  const len = EARTH_RADIUS * 1.6;
  const base = position.clone();
  const mid = base.clone().add(dir.clone().multiplyScalar(len / 2));

  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.12;
      ref.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      <mesh position={mid} quaternion={quat}>
        <cylinderGeometry args={[0.012, 0.05, len, 16, 1, true]} />
        <meshBasicMaterial
          color="#FFB35C"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={mid} quaternion={quat}>
        <cylinderGeometry args={[0.004, 0.012, len, 12, 1, true]} />
        <meshBasicMaterial color="#FFE3B0" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* base marker + pulsing ring */}
      <group ref={ref} position={base} quaternion={quat}>
        <mesh>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#FFE3B0" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.05, 0.07, 32]} />
          <meshBasicMaterial color="#FF7A3C" transparent opacity={0.8} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function SatLayer({ date }: { date: Date }) {
  const layers = useZenith((s) => s.layers);
  const select = useZenith((s) => s.select);
  const [hover, setHover] = useState<string | null>(null);

  const sats: SatState[] = useMemo(() => propagateAll(FALLBACK_TLES, date), [date]);

  // ISS ground track (only the station group's first entry).
  const issTle: TLE | undefined = FALLBACK_TLES.find((t) => t.name.includes('ISS'));
  const issTrack = useMemo(() => {
    if (!issTle || !layers.iss) return [];
    return track(issTle, date).map((p) => satToVec3(p.lat, p.lon, p.alt));
  }, [issTle, date, layers.iss]);

  return (
    <group>
      {layers.iss && issTrack.length > 1 && (
        <Line points={issTrack} color="#FFB35C" lineWidth={1} transparent opacity={0.35} dashed dashSize={0.06} gapSize={0.04} />
      )}
      {sats.map((s) => {
        const isISS = s.name.includes('ISS');
        if (isISS && !layers.iss) return null;
        if (!isISS && !layers.satellites) return null;
        const pos = satToVec3(s.lat, s.lon, s.alt);
        return (
          <SatMarker
            key={s.name}
            sat={s}
            pos={pos}
            isISS={isISS}
            hovered={hover === s.name}
            onOver={() => setHover(s.name)}
            onOut={() => setHover(null)}
            onSelect={() =>
              select({
                kind: isISS ? 'iss' : 'satellite',
                name: s.name,
                lines: [
                  { label: 'Altitude', value: `${s.alt.toFixed(0)} km` },
                  { label: 'Velocity', value: `${s.velocity.toFixed(2)} km/s` },
                  { label: 'Latitude', value: `${s.lat.toFixed(2)}°` },
                  { label: 'Longitude', value: `${s.lon.toFixed(2)}°` },
                  { label: 'Class', value: s.group },
                ],
              })
            }
          />
        );
      })}
    </group>
  );
}

function SatMarker({
  sat,
  pos,
  isISS,
  hovered,
  onOver,
  onOut,
  onSelect,
}: {
  sat: SatState;
  pos: THREE.Vector3;
  isISS: boolean;
  hovered: boolean;
  onOver: () => void;
  onOut: () => void;
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => (isISS ? issIcon() : satIcon(GROUP_COLORS[sat.group])), [isISS, sat.group]);
  const base = isISS ? 0.34 : 0.16;
  const sc = useRef(base);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const want = base * (hovered ? 1.4 : 1) * (isISS ? 1 + Math.sin(clock.elapsedTime * 2.5) * 0.05 : 1);
    sc.current += (want - sc.current) * 0.2;
    ref.current.scale.setScalar(sc.current);
  });

  return (
    <group position={pos}>
      <sprite ref={ref} onPointerOver={(e) => { e.stopPropagation(); onOver(); }} onPointerOut={onOut} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
      </sprite>
      {hovered && (
        <Html center distanceFactor={isISS ? 9 : 7} style={{ pointerEvents: 'none' }} position={[0, isISS ? 0.28 : 0.18, 0]}>
          <div className={`whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wider backdrop-blur-md ${isISS ? 'border-ember/50 bg-ember/15 text-ember' : 'border-white/15 bg-ink/80 text-starlight'}`}>
            {sat.name} · {sat.alt.toFixed(0)} km
          </div>
        </Html>
      )}
    </group>
  );
}

export default function Earth() {
  const groupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { day, night, clouds, spec } = useEarthTextures();
  const location = useZenith((s) => s.location);
  const setLocation = useZenith((s) => s.setLocation);
  const showClouds = useZenith((s) => s.layers.clouds);
  const reduced = useZenith((s) => s.reducedMotion);
  const effectiveDate = useZenith((s) => s.effectiveDate);
  const now = useZenith((s) => s.now);
  const scrub = useZenith((s) => s.scrubMinutes);
  const yearOff = useZenith((s) => s.yearOffset);
  const downAt = useRef<{ x: number; y: number } | null>(null);

  const pinFromPoint = (point: THREE.Vector3) => {
    const { lat, lon } = vec3ToLatLon(point);
    setLocation({ lat, lon, label: `${lat.toFixed(2)}, ${lon.toFixed(2)}` });
    // best-effort reverse geocode for a human label
    fetch(`/api/geocode?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((j) => {
        const label = (j?.data?.label as string) || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        setLocation({ lat, lon, label });
      })
      .catch(() => {});
  };

  const date = useMemo(() => effectiveDate(), [now, scrub, yearOff, effectiveDate]);

  const uniforms = useMemo(
    () => ({
      dayMap: { value: day },
      nightMap: { value: night },
      specMap: { value: spec },
      sunDir: { value: new THREE.Vector3(1, 0, 0) },
      ember: { value: new THREE.Color('#FFB35C') },
    }),
    [day, night, spec],
  );

  const pinPos = useMemo(() => latLonToVec3(location.lat, location.lon, EARTH_RADIUS * 1.001), [location]);

  useFrame(() => {
    const sub = subSolarPoint(date);
    const sun = latLonToVec3(sub.lat, sub.lon, 1).normalize();
    if (matRef.current) (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(sun);
    if (cloudsRef.current && !reduced) cloudsRef.current.rotation.y += 0.0003;
  });

  return (
    <group ref={groupRef}>
      {/* Earth surface */}
      <mesh
        onPointerDown={(e) => {
          downAt.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const d = downAt.current;
          downAt.current = null;
          if (!d) return;
          const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
          if (moved < 6) pinFromPoint(e.point); // a tap, not a drag-rotate
        }}
      >
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <shaderMaterial ref={matRef} vertexShader={dayVert} fragmentShader={dayFrag} uniforms={uniforms} />
      </mesh>

      {/* Clouds */}
      {showClouds && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[EARTH_RADIUS * 1.012, 64, 64]} />
          <meshStandardMaterial map={clouds} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}

      {/* Atmosphere shell */}
      <mesh scale={1.05}>
        <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
        <shaderMaterial vertexShader={atmoVert} fragmentShader={atmoFrag} transparent blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <ZenithBeam position={pinPos} />
      <SatLayer date={date} />
    </group>
  );
}

'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { STARS } from '@/data/stars';
import { raDecToVec3, mulberry32 } from '@/lib/scene';

const R = 400;

/** Deep-space backdrop: real bright stars on the celestial sphere + seeded fill. */
export default function Starfield() {
  const { positions, colors, sizes } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const siz: number[] = [];
    const c = new THREE.Color();

    for (const s of STARS) {
      const v = raDecToVec3(s.ra, s.dec, R);
      pos.push(v.x, v.y, v.z);
      c.set(s.color);
      col.push(c.r, c.g, c.b);
      siz.push(Math.max(1.5, 5 - s.mag));
    }

    const rng = mulberry32(99);
    for (let i = 0; i < 2600; i++) {
      const ra = rng() * 24;
      const dec = (rng() - 0.5) * 180;
      const v = raDecToVec3(ra, dec, R * (0.9 + rng() * 0.2));
      pos.push(v.x, v.y, v.z);
      const shade = 0.6 + rng() * 0.4;
      col.push(shade, shade, shade * (0.95 + rng() * 0.05));
      siz.push(0.6 + rng() * 1.2);
    }

    return { positions: new Float32Array(pos), colors: new Float32Array(col), sizes: new Float32Array(siz) };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial size={1.5} vertexColors transparent opacity={0.9} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

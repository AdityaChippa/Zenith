'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useZenith } from '@/lib/store';
import Starfield from './Starfield';
import Earth from './Earth';
import SkyDome from './SkyDome';
import CameraRig from './CameraRig';

export default function Experience() {
  const phase = useZenith((s) => s.phase);
  const select = useZenith((s) => s.select);

  return (
    <Canvas
      camera={{ position: [0, 1.4, 6.2], fov: 42, near: 0.01, far: 2000 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      dpr={[1, 2]}
      onPointerMissed={() => select(null)}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#05070D']} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 3, 5]} intensity={0.6} />

      <Suspense fallback={null}>
        <Starfield />
        {phase !== 'dome' && <Earth />}
        {phase === 'dome' && <SkyDome />}
      </Suspense>

      <CameraRig />
    </Canvas>
  );
}

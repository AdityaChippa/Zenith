'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import * as THREE from 'three';
import { useZenith } from '@/lib/store';

const GLOBE_POS = new THREE.Vector3(0, 1.4, 6.2);
const GLOBE_TARGET = new THREE.Vector3(0, 0, 0);
const DOME_POS = new THREE.Vector3(0, 0.2, 0.1);
const DOME_TARGET = new THREE.Vector3(0, 28, -22); // up-and-north: the zenith tilt

export default function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const phase = useZenith((s) => s.phase);
  const reduced = useZenith((s) => s.reducedMotion);
  const prev = useRef(phase);

  useEffect(() => {
    if (phase === prev.current) return;
    prev.current = phase;
    const c = controls.current;
    if (!c) return;

    const goDome = phase === 'dome';
    const toPos = goDome ? DOME_POS : GLOBE_POS;
    const toTarget = goDome ? DOME_TARGET : GLOBE_TARGET;
    const dur = reduced ? 0.001 : 1.6;

    c.enabled = false;
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(c.target);
    gsap.to(camera.position, { x: toPos.x, y: toPos.y, z: toPos.z, duration: dur, ease: 'power3.inOut' });
    gsap.to(c.target, {
      x: toTarget.x,
      y: toTarget.y,
      z: toTarget.z,
      duration: dur,
      ease: 'power3.inOut',
      onUpdate: () => c.update(),
      onComplete: () => {
        c.enabled = true;
        c.update();
      },
    });
  }, [phase, camera, reduced]);

  const dome = phase === 'dome';

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={dome ? -0.3 : 0.5}
      minDistance={dome ? 0.01 : 3.2}
      maxDistance={dome ? 0.5 : 14}
      autoRotate={phase === 'globe' && !reduced}
      autoRotateSpeed={0.18}
    />
  );
}

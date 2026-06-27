"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

import { useStore } from "@/demo/state/useStore";
import Globe from "./Globe";
import CelestialSphere from "./CelestialSphere";
import Bodies from "./Bodies";
import LookControls from "./LookControls";

/** Camera rig: animates the transition between globe and sky views. */
function Rig() {
  const view = useStore((s) => s.view);
  const { camera } = useThree();
  const prev = useRef(view);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (view === prev.current) return;
    const tween = { fov: cam.fov };

    if (view === "sky") {
      cam.position.set(0, 0, 0);
      tween.fov = 18;
      cam.fov = 18;
      cam.updateProjectionMatrix();
      gsap.to(tween, {
        fov: 62,
        duration: 1.5,
        ease: "power3.out",
        onUpdate: () => {
          cam.fov = tween.fov;
          cam.updateProjectionMatrix();
        },
      });
    } else {
      cam.position.set(0, 0.45, 3.2);
      gsap.fromTo(
        tween,
        { fov: 70 },
        {
          fov: 45,
          duration: 1.1,
          ease: "power2.out",
          onUpdate: () => {
            cam.fov = tween.fov;
            cam.updateProjectionMatrix();
          },
        },
      );
    }
    prev.current = view;
  }, [view, camera]);

  return null;
}

function SceneContents() {
  const view = useStore((s) => s.view);
  return (
    <>
      <Rig />
      {view === "globe" ? (
        <>
          <Stars radius={300} depth={60} count={4000} factor={4} saturation={0} fade speed={0.4} />
          <Globe />
          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={1.6}
            maxDistance={6}
            autoRotate={!useStore.getState().observer}
            autoRotateSpeed={0.35}
            rotateSpeed={0.5}
          />
        </>
      ) : (
        <>
          <CelestialSphere />
          <Bodies />
          <LookControls initialAzDeg={180} initialAltDeg={48} />
        </>
      )}
    </>
  );
}

export default function ZenithCanvas() {
  const select = useStore((s) => s.select);
  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.05, far: 2000, position: [0, 0.45, 3.2] }}
      onPointerMissed={() => select(null)}
      className="absolute inset-0"
    >
      <color attach="background" args={["#05060A"]} />
      <Suspense fallback={null}>
        <SceneContents />
      </Suspense>
    </Canvas>
  );
}

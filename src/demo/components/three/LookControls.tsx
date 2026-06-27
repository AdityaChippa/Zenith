"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const DEG = Math.PI / 180;

interface Props {
  /** Initial look azimuth (deg from North, clockwise) and altitude (deg). */
  initialAzDeg?: number;
  initialAltDeg?: number;
  enabled?: boolean;
}

/**
 * First-person "stand on the ground and look up" controls. The camera sits at
 * the origin; dragging yaws/pitches the view, the wheel adjusts field of view.
 * Pitch is clamped just shy of straight up/down.
 */
export default function LookControls({
  initialAzDeg = 180,
  initialAltDeg = 45,
  enabled = true,
}: Props) {
  const { camera, gl } = useThree();
  // yaw measured so that 0 looks North (-Z); az increases clockwise (to East/+X)
  const yaw = useRef(initialAzDeg * DEG);
  const pitch = useRef(initialAltDeg * DEG);
  const target = useRef({ yaw: initialAzDeg * DEG, pitch: initialAltDeg * DEG });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const fov = useRef(60);

  useEffect(() => {
    camera.position.set(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement;

    const down = (e: PointerEvent) => {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      const speed = (fov.current / 60) * 0.0026;
      target.current.yaw += dx * speed;
      target.current.pitch = THREE.MathUtils.clamp(
        target.current.pitch + dy * speed,
        -89 * DEG,
        89 * DEG,
      );
    };
    const up = (e: PointerEvent) => {
      dragging.current = false;
      el.releasePointerCapture?.(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      fov.current = THREE.MathUtils.clamp(fov.current + e.deltaY * 0.05, 22, 90);
    };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [enabled, gl]);

  useFrame(() => {
    // ease toward target for weighted motion
    yaw.current += (target.current.yaw - yaw.current) * 0.12;
    pitch.current += (target.current.pitch - pitch.current) * 0.12;

    const cp = Math.cos(pitch.current);
    // direction in dome frame: az clockwise from North(-Z), alt up(+Y)
    const dir = new THREE.Vector3(
      cp * Math.sin(yaw.current),
      Math.sin(pitch.current),
      -cp * Math.cos(yaw.current),
    );
    camera.lookAt(dir);

    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - fov.current) > 0.01) {
      cam.fov += (fov.current - cam.fov) * 0.15;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

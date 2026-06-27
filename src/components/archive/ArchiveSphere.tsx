'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

export interface ArchiveItem {
  id: string;
  tag: string;
  title: string;
  meta: string;
  body: string;
  accent: string;
  image?: string;     // real image (also shown on the card face when it loads)
  images?: string[];  // gallery
  link?: string;      // external link (news cards)
  kind?: string;
}

const SPHERE_R = 11.5;
const CARD_W = 3.3;
const CARD_H = 4.4;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, max: number) {
  const words = text.split(' '); let line = ''; let yy = y; let n = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; if (++n >= max - 1) break; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}
function mulberry(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const W = 560, H = 748, RAD = 38;

let _mask: THREE.CanvasTexture | null = null;
function roundMask(): THREE.CanvasTexture {
  if (_mask) return _mask;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; roundRect(ctx, 5, 5, W - 10, H - 10, RAD); ctx.fill();
  _mask = new THREE.CanvasTexture(c);
  return _mask;
}

// Procedural cosmic poster (used when there's no image, or image fails to load).
function makeArt(item: ArchiveItem, idx: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!; const rnd = mulberry(idx * 7919 + 13); const pad = 36;
  roundRect(ctx, 5, 5, W - 10, H - 10, RAD); ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, '#1a1c22'); g.addColorStop(1, '#0b0c0f'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) { const bx = rnd() * W, by = rnd() * H * 0.55, br = 120 + rnd() * 180; const rg = ctx.createRadialGradient(bx, by, 0, bx, by, br); rg.addColorStop(0, item.accent + (i === 0 ? '55' : '2e')); rg.addColorStop(1, '#00000000'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
  for (let i = 0; i < 90; i++) { const a = 0.25 + rnd() * 0.65; ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(rnd() * W, rnd() * H * 0.62, rnd() > 0.85 ? 2 : 1, rnd() > 0.85 ? 2 : 1); }
  drawText(ctx, item);
  ctx.restore(); frame(ctx);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Transparent overlay (scrim + text) drawn OVER a real image plane.
function makeOverlay(item: ArchiveItem): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  roundRect(ctx, 5, 5, W - 10, H - 10, RAD); ctx.save(); ctx.clip();
  const dg = ctx.createLinearGradient(0, H * 0.32, 0, H); dg.addColorStop(0, 'rgba(8,9,11,0)'); dg.addColorStop(1, 'rgba(8,9,11,0.96)'); ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
  const tg = ctx.createLinearGradient(0, 0, 0, 120); tg.addColorStop(0, 'rgba(8,9,11,0.55)'); tg.addColorStop(1, 'rgba(8,9,11,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 120);
  drawText(ctx, item);
  ctx.restore(); frame(ctx);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function drawText(ctx: CanvasRenderingContext2D, item: ArchiveItem) {
  const pad = 36;
  ctx.fillStyle = item.accent; ctx.fillRect(pad, pad + 4, 40, 3);
  ctx.fillStyle = 'rgba(245,245,247,0.92)'; ctx.font = '600 16px ui-monospace, monospace'; ctx.textBaseline = 'top'; ctx.fillText(item.tag.toUpperCase(), pad, pad + 18);
  ctx.fillStyle = '#F5F5F7'; ctx.font = '500 50px Georgia, serif'; wrap(ctx, item.title, pad, H - 214, W - pad * 2, 54, 3);
  ctx.fillStyle = 'rgba(161,161,166,0.9)'; ctx.font = '500 17px ui-monospace, monospace'; ctx.fillText(item.meta, pad, H - 64);
  ctx.fillStyle = item.accent; ctx.font = '600 13px ui-monospace, monospace'; ctx.fillText('OPEN  →', W - pad - 64, H - 62);
}
function frame(ctx: CanvasRenderingContext2D) {
  roundRect(ctx, 5, 5, W - 10, H - 10, RAD); ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5; ctx.stroke();
}

function fibSphere(n: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []; const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) { let y = 1 - (i / Math.max(n - 1, 1)) * 2; y *= 0.85; const rad = Math.sqrt(Math.max(0, 1 - y * y)); const th = phi * i; pts.push(new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad)); }
  return pts;
}

function Card({ item, idx, pos, selectedId, onSelect, onHover }: {
  item: ArchiveItem; idx: number; pos: THREE.Vector3; selectedId: string | null; onSelect: (it: ArchiveItem) => void; onHover: (h: boolean) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const baseRef = useRef<THREE.Mesh>(null);
  const art = useMemo(() => makeArt(item, idx), [item, idx]);
  const overlay = useMemo(() => makeOverlay(item), [item]);
  const mask = useMemo(() => roundMask(), []);
  const [imgTex, setImgTex] = useState<THREE.Texture | null>(null);
  const [hovered, setHovered] = useState(false);
  const focus = useRef(0);
  const dir = useMemo(() => pos.clone().normalize(), [pos]);

  // Load the real image as a card-face texture (falls back to procedural art).
  useEffect(() => {
    if (!item.image) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(item.image, (t) => { if (alive) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; setImgTex(t); } }, undefined, () => {});
    return () => { alive = false; };
  }, [item.image]);

  useEffect(() => () => { art.dispose(); overlay.dispose(); }, [art, overlay]);

  useFrame(() => {
    if (!ref.current || !baseRef.current) return;
    const want = hovered ? 1 : 0;
    focus.current += (want - focus.current) * 0.16;
    ref.current.position.copy(pos).addScaledVector(dir, -focus.current * 1.2);
    baseRef.current.scale.setScalar(1 + focus.current * 0.09);
    const dim = selectedId && selectedId !== item.id ? 0.1 : 1;
    const mat = baseRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity += (dim - mat.opacity) * 0.16;
    const ov = (ref.current.children[1] as THREE.Mesh | undefined);
    if (ov) { (ov.material as THREE.MeshBasicMaterial).opacity += (dim - (ov.material as THREE.MeshBasicMaterial).opacity) * 0.16; ov.scale.copy(baseRef.current.scale); }
  });

  const showImage = !!imgTex;

  return (
    <Billboard ref={ref} position={pos}>
      <mesh ref={baseRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(true); }}
        onPointerOut={() => { setHovered(false); onHover(false); }}
        onClick={(e) => { e.stopPropagation(); onSelect(item); }}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        {showImage
          ? <meshBasicMaterial map={imgTex} alphaMap={mask} transparent toneMapped={false} />
          : <meshBasicMaterial map={art} transparent toneMapped={false} />}
      </mesh>
      {showImage && (
        <mesh position={[0, 0, 0.01]} raycast={() => null}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshBasicMaterial map={overlay} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, 0, -0.02]} scale={hovered ? 1 : 0.0001} raycast={() => null}>
        <planeGeometry args={[CARD_W + 0.4, CARD_H + 0.4]} />
        <meshBasicMaterial color={item.accent} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

function Rig({ items, selectedId, onSelect }: { items: ArchiveItem[]; selectedId: string | null; onSelect: (it: ArchiveItem) => void }) {
  const group = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const yaw = useRef(0); const pitch = useRef(0); const yawV = useRef(0.0012); const pitchV = useRef(0);
  const drag = useRef(false); const last = useRef({ x: 0, y: 0 }); const hoverCount = useRef(0);
  const positions = useMemo(() => fibSphere(items.length).map((p) => p.clone().multiplyScalar(SPHERE_R)), [items.length]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => { drag.current = true; last.current = { x: e.clientX, y: e.clientY }; el.setPointerCapture?.(e.pointerId); el.style.cursor = 'grabbing'; };
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - last.current.x, dy = e.clientY - last.current.y; last.current = { x: e.clientX, y: e.clientY };
      yawV.current = dx * 0.0017; pitchV.current = dy * 0.0012;
      yaw.current += yawV.current; pitch.current = THREE.MathUtils.clamp(pitch.current + pitchV.current, -0.95, 0.95);
    };
    const up = (e: PointerEvent) => { drag.current = false; el.releasePointerCapture?.(e.pointerId); el.style.cursor = 'grab'; };
    const key = (e: KeyboardEvent) => {
      const sp = 0.04;
      if (e.key === 'ArrowLeft') yawV.current = -sp; else if (e.key === 'ArrowRight') yawV.current = sp;
      else if (e.key === 'ArrowUp') pitch.current = THREE.MathUtils.clamp(pitch.current - 0.12, -0.95, 0.95);
      else if (e.key === 'ArrowDown') pitch.current = THREE.MathUtils.clamp(pitch.current + 0.12, -0.95, 0.95);
    };
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('keydown', key);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('keydown', key); };
  }, [gl]);

  useFrame(() => {
    if (!group.current) return;
    if (!drag.current) { yaw.current += yawV.current; const idle = hoverCount.current > 0 ? 0 : 0.0012; yawV.current += (idle - yawV.current) * 0.04; pitchV.current *= 0.9; }
    group.current.rotation.order = 'YXZ'; group.current.rotation.y = yaw.current; group.current.rotation.x += (pitch.current - group.current.rotation.x) * 0.1;
  });

  return (
    <group ref={group}>
      {items.map((it, i) => <Card key={it.id} item={it} idx={i} pos={positions[i]} selectedId={selectedId} onSelect={onSelect} onHover={(h) => (hoverCount.current += h ? 1 : -1)} />)}
    </group>
  );
}

function Orbs() {
  const orbs = useMemo(() => [{ c: '#FF8A3D', p: [-9, 4, -8] }, { c: '#3DD8E0', p: [10, -3, -7] }, { c: '#4DF0A8', p: [3, 8, 8] }, { c: '#8B7CFF', p: [-6, -7, 7] }], []);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.03; });
  return (<group ref={ref}>{orbs.map((o, i) => (<mesh key={i} position={o.p as [number, number, number]}><sphereGeometry args={[2.6, 24, 24]} /><meshBasicMaterial color={o.c} transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>))}</group>);
}

export default function ArchiveSphere({ items, selectedId, onSelect }: { items: ArchiveItem[]; selectedId: string | null; onSelect: (it: ArchiveItem) => void }) {
  return (
    <Canvas camera={{ position: [0, 0, 0.01], fov: 60, near: 0.01, far: 100 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} dpr={[1, 2]} style={{ position: 'absolute', inset: 0 }}>
      <color attach="background" args={['#08090B']} />
      <fog attach="fog" args={['#08090B', 14, 28]} />
      <Orbs />
      {items.length > 0 && <Rig items={items} selectedId={selectedId} onSelect={onSelect} />}
    </Canvas>
  );
}

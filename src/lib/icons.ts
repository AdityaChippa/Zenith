'use client';

import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function finalize(c: HTMLCanvasElement, key: string): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Modern little satellite glyph (central bus + two solar wings) in `color`. */
export function satIcon(color: string): THREE.Texture {
  const key = `sat:${color}`;
  if (cache.has(key)) return cache.get(key)!;
  const S = 80;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const cx = S / 2;
  const cy = S / 2;

  // glow
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, S / 2);
  g.addColorStop(0, color + 'cc');
  g.addColorStop(0.4, color + '33');
  g.addColorStop(1, '#00000000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 9);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  // solar wings
  ctx.globalAlpha = 0.95;
  ctx.strokeRect(-26, -8, 14, 16);
  ctx.strokeRect(12, -8, 14, 16);
  // panel mullions
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-19, -8); ctx.lineTo(-19, 8);
  ctx.moveTo(19, -8); ctx.lineTo(19, 8);
  ctx.stroke();
  // bus
  ctx.fillStyle = '#F4F6FA';
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = color;
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
  return finalize(c, key);
}

/** Distinct, larger ISS station marker (central module + 4 arrays + ring). */
export function issIcon(): THREE.Texture {
  const key = 'iss';
  if (cache.has(key)) return cache.get(key)!;
  const S = 160;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const cx = S / 2;
  const cy = S / 2;
  const ember = '#FFB35C';

  // glow
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, S / 2);
  g.addColorStop(0, 'rgba(255,179,92,0.85)');
  g.addColorStop(0.35, 'rgba(255,179,92,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // orbit ring
  ctx.strokeStyle = 'rgba(255,227,176,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 46, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 7);
  // truss
  ctx.strokeStyle = ember;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-44, 0); ctx.lineTo(44, 0);
  ctx.stroke();
  // four solar arrays
  ctx.fillStyle = 'rgba(255,179,92,0.85)';
  [-44, -22, 14, 36].forEach((x) => {
    ctx.fillRect(x, -16, 8, 12);
    ctx.fillRect(x, 4, 8, 12);
  });
  // central modules
  ctx.fillStyle = '#FFE3B0';
  ctx.fillRect(-10, -7, 20, 14);
  ctx.fillStyle = '#FF7A3C';
  ctx.fillRect(-6, -4, 12, 8);
  ctx.restore();
  return finalize(c, key);
}

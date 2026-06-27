'use client';

import { computeBodies, compass } from '@/lib/astronomy';
import { lookAnglesAll } from '@/lib/satellites';
import { FALLBACK_TLES } from '@/data/fallbacks';

interface Overhead {
  name: string;
  az: number;
  alt: number;
}

function fmtSignedDeg(d: number) {
  const s = d >= 0 ? '+' : '−';
  return `${s}${Math.abs(d).toFixed(4)}°`;
}

/**
 * Capture the live WebGL canvas and compose a branded "Sky Postcard" PNG —
 * the user's exact sky at a moment, ready to share. (Ported from the demo.)
 * Requires the canvas to be created with preserveDrawingBuffer: true.
 */
export function exportSkyPostcard(date: Date, lat: number, lon: number, locationLabel: string) {
  const source = document.querySelector('canvas');
  if (!source) return;

  const W = 1200;
  const H = 1500;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#08090B';
  ctx.fillRect(0, 0, W, H);

  // sky image (cover into the top region)
  const imgH = 1080;
  const sAspect = source.width / source.height;
  const dAspect = W / imgH;
  let sx = 0, sy = 0, sw = source.width, sh = source.height;
  if (sAspect > dAspect) { sw = source.height * dAspect; sx = (source.width - sw) / 2; }
  else { sh = source.width / dAspect; sy = (source.height - sh) / 2; }
  try { ctx.drawImage(source, sx, sy, sw, sh, 0, 0, W, imgH); } catch { /* tainted */ }

  // fade into the caption
  const grad = ctx.createLinearGradient(0, imgH - 320, 0, imgH);
  grad.addColorStop(0, 'rgba(8,9,11,0)');
  grad.addColorStop(1, 'rgba(8,9,11,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, imgH - 320, W, 320);

  // hairline frame
  ctx.strokeStyle = 'rgba(245,245,247,0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // wordmark
  ctx.fillStyle = '#FF8A3D';
  ctx.font = "600 22px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText('PROJECT ZENITH · THE CELESTIAL EYE', 72, imgH + 70);

  // location
  ctx.fillStyle = '#F5F5F7';
  ctx.font = "600 64px Georgia, serif";
  ctx.fillText(locationLabel, 70, imgH + 150);

  // datetime + coords
  ctx.fillStyle = '#A1A1A6';
  ctx.font = "400 26px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText(`${date.toUTCString()}`, 72, imgH + 195);
  ctx.fillText(`${fmtSignedDeg(lat)}   ${fmtSignedDeg(lon)}`, 72, imgH + 232);

  // overhead summary (bodies + satellites above the horizon)
  const bodies = computeBodies(date, lat, lon)
    .filter((b) => b.altitude > 0)
    .map((b) => ({ name: b.name, az: b.azimuth, alt: b.altitude }));
  const sats = lookAnglesAll(FALLBACK_TLES, date, lat, lon).map((s) => ({ name: s.name, az: s.az, alt: s.alt }));
  const overhead: Overhead[] = [...bodies, ...sats].sort((a, b) => b.alt - a.alt);

  ctx.fillStyle = '#FF8A3D';
  ctx.font = "600 20px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText(`DIRECTLY OVERHEAD · ${overhead.length}`, 72, imgH + 300);
  ctx.fillStyle = '#cdd6e6';
  ctx.font = "400 24px Georgia, serif";
  overhead.slice(0, 5).forEach((o, i) => {
    ctx.fillText(`${o.name}  —  ${compass(o.az)} ${o.alt.toFixed(0)}°`, 72, imgH + 340 + i * 34);
  });

  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = `zenith-sky_${date.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`;
  a.click();
}

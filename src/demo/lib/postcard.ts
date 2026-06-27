import type { SkyScene } from "@/demo/engine/types";
import { fmtDateLocal, fmtClockUTC, fmtSignedDeg, compass } from "@/demo/components/hud/format";

/**
 * Capture the live WebGL canvas and compose a branded "Sky Postcard" PNG —
 * the user's exact sky at a moment, ready to share. Requires the canvas to be
 * created with preserveDrawingBuffer: true.
 */
export async function exportSkyPostcard(scene: SkyScene, locationLabel: string) {
  const source = document.querySelector("canvas");
  if (!source) return;

  const W = 1200;
  const H = 1500;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return;

  // backdrop
  ctx.fillStyle = "#05060A";
  ctx.fillRect(0, 0, W, H);

  // sky image (cover into the top region)
  const imgH = 1080;
  const sAspect = source.width / source.height;
  const dAspect = W / imgH;
  let sx = 0, sy = 0, sw = source.width, sh = source.height;
  if (sAspect > dAspect) {
    sw = source.height * dAspect;
    sx = (source.width - sw) / 2;
  } else {
    sh = source.width / dAspect;
    sy = (source.height - sh) / 2;
  }
  try {
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, W, imgH);
  } catch {
    /* tainted/unsupported — leave the backdrop */
  }

  // gradient fade into the caption
  const grad = ctx.createLinearGradient(0, imgH - 320, 0, imgH);
  grad.addColorStop(0, "rgba(5,6,10,0)");
  grad.addColorStop(1, "rgba(5,6,10,1)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, imgH - 320, W, 320);

  // hairline frame
  ctx.strokeStyle = "rgba(232,236,245,0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  const date = scene.time;
  // wordmark
  ctx.fillStyle = "#4FE3C1";
  ctx.font = "600 22px 'IBM Plex Mono', monospace";
  ctx.fillText("PROJECT ZENITH · THE CELESTIAL EYE", 72, imgH + 70);

  // location
  ctx.fillStyle = "#E8ECF5";
  ctx.font = "600 64px 'Space Grotesk', sans-serif";
  ctx.fillText(locationLabel, 70, imgH + 150);

  // datetime + coords
  ctx.fillStyle = "#6B7488";
  ctx.font = "400 26px 'IBM Plex Mono', monospace";
  ctx.fillText(
    `${fmtDateLocal(date)}   ${fmtClockUTC(date)}`,
    72,
    imgH + 195,
  );
  ctx.fillText(
    `${fmtSignedDeg(scene.observer.latDeg)}  ${fmtSignedDeg(scene.observer.lonDeg)}`,
    72,
    imgH + 232,
  );

  // overhead summary
  const overhead = scene.overhead.slice(0, 5);
  ctx.fillStyle = "#4FE3C1";
  ctx.font = "600 20px 'IBM Plex Mono', monospace";
  ctx.fillText(
    `DIRECTLY OVERHEAD · ${scene.overhead.length}`,
    72,
    imgH + 300,
  );
  ctx.fillStyle = "#cdd6e6";
  ctx.font = "400 24px 'Space Grotesk', sans-serif";
  overhead.forEach((o, i) => {
    ctx.fillText(
      `${o.name}  —  ${compass(o.azDeg)} ${o.altDeg.toFixed(0)}\u00b0`,
      72,
      imgH + 340 + i * 34,
    );
  });

  // export
  const dataUrl = c.toDataURL("image/png");
  const a = document.createElement("a");
  const stamp = date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = dataUrl;
  a.download = `zenith-sky_${stamp}.png`;
  a.click();
}

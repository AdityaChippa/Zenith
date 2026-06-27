export function fmtDeg(n: number, dp = 1): string {
  return `${n.toFixed(dp)}\u00b0`;
}

export function fmtSignedDeg(n: number, dp = 2): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(dp)}\u00b0`;
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];
export function compass(azDeg: number): string {
  return COMPASS[Math.round(((azDeg % 360) / 22.5)) % 16];
}

export function fmtClockUTC(d: Date): string {
  return (
    d.toISOString().slice(11, 19) + " UTC"
  );
}

export function fmtClockLocal(d: Date): string {
  return d.toLocaleTimeString([], { hour12: false });
}

export function fmtDateLocal(d: Date): string {
  return d.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function fmtCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (x: number) => x.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function kindLabel(kind: string): string {
  switch (kind) {
    case "iss":
      return "Space Station";
    case "satellite":
      return "Satellite";
    case "planet":
      return "Planet";
    case "sun":
      return "Star";
    case "moon":
      return "Natural Satellite";
    default:
      return kind;
  }
}

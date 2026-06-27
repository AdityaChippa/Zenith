import * as AE from "astronomy-engine";
import { pickModule } from "./_interop";
// astronomy-engine ships dual CJS/ESM builds that bundlers resolve
// differently; this shim exposes the same API surface under both.
const Astronomy: typeof AE = pickModule(AE);

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function normalizeDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

/** Greenwich Apparent Sidereal Time, in hours [0,24). */
export function gastHours(date: Date): number {
  // astronomy-engine returns apparent sidereal time in sidereal hours.
  const h = Astronomy.SiderealTime(date);
  return ((h % 24) + 24) % 24;
}

/** Local Apparent Sidereal Time, in hours [0,24). */
export function lastHours(date: Date, lonDeg: number): number {
  const h = gastHours(date) + lonDeg / 15;
  return ((h % 24) + 24) % 24;
}

/** Local Apparent Sidereal Time, in radians. */
export function lastRad(date: Date, lonDeg: number): number {
  return (lastHours(date, lonDeg) / 12) * Math.PI;
}

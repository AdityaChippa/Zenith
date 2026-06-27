import * as SAT from "satellite.js";
import { RAD, normalizeDeg } from "./time";
import { pickModule } from "./_interop";

// satellite.js dual CJS/ESM interop (see astro.ts for rationale).
const sat: typeof SAT = pickModule(SAT);
import type { NextPass, Observer, SkyObject, Tle } from "./types";

export interface SatState {
  /** Horizontal look angles from the observer. */
  altDeg: number;
  azDeg: number;
  rangeKm: number;
  /** Sub-point + orbital state. */
  latDeg: number;
  lonDeg: number;
  altitudeKm: number;
  speedKmS: number;
}

type SatRec = ReturnType<typeof sat.twoline2satrec>;

export function parseTle(tle: Tle): SatRec | null {
  try {
    const rec = sat.twoline2satrec(tle.line1, tle.line2);
    // satrec.error is non-zero on malformed elements.
    if ((rec as unknown as { error: number }).error) return null;
    return rec;
  } catch {
    return null;
  }
}

function observerGd(o: Observer) {
  return {
    longitude: sat.degreesToRadians(o.lonDeg),
    latitude: sat.degreesToRadians(o.latDeg),
    height: (o.heightM ?? 0) / 1000, // km
  };
}

/** Propagate one satellite to `date` and resolve look angles + sub-point. */
export function propagateSat(
  rec: SatRec,
  date: Date,
  observer: Observer,
): SatState | null {
  const pv = sat.propagate(rec, date);
  const position = pv.position as { x: number; y: number; z: number } | false;
  const velocity = pv.velocity as { x: number; y: number; z: number } | false;
  if (!position || !velocity) return null;

  const gmst = sat.gstime(date);
  const geo = sat.eciToGeodetic(position, gmst);
  const ecf = sat.eciToEcf(position, gmst);
  const look = sat.ecfToLookAngles(observerGd(observer), ecf);

  const speedKmS = Math.sqrt(
    velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z,
  );

  return {
    altDeg: look.elevation * RAD,
    azDeg: normalizeDeg(look.azimuth * RAD),
    rangeKm: look.rangeSat,
    latDeg: sat.degreesLat(geo.latitude),
    lonDeg: sat.degreesLong(geo.longitude),
    altitudeKm: geo.height,
    speedKmS,
  };
}

export function satToSkyObject(
  tle: Tle,
  rec: SatRec,
  date: Date,
  observer: Observer,
): SkyObject | null {
  const s = propagateSat(rec, date, observer);
  if (!s) return null;
  const isIss = /(^| )ISS( |$)|ZARYA/i.test(tle.name);
  return {
    id: tle.name.trim().replace(/\s+/g, "-").toLowerCase(),
    name: tle.name.trim(),
    kind: isIss ? "iss" : "satellite",
    altDeg: s.altDeg,
    azDeg: s.azDeg,
    overhead: false,
    sub: {
      latDeg: s.latDeg,
      lonDeg: s.lonDeg,
      altitudeKm: s.altitudeKm,
      speedKmS: s.speedKmS,
      rangeKm: s.rangeKm,
    },
  };
}

/**
 * Find the next visible pass of a satellite above `thresholdDeg`, searching
 * forward from `from` up to `maxHours`. Coarse 30 s scan, then 1 s refinement
 * of the acquisition edge. Returns null if no pass is found in the window.
 */
export function nextPass(
  rec: SatRec,
  observer: Observer,
  from: Date,
  thresholdDeg = 10,
  maxHours = 24,
): NextPass | null {
  const coarse = 30_000; // ms
  const horizonMs = maxHours * 3_600_000;
  const elevAt = (t: number): number | null => {
    const s = propagateSat(rec, new Date(t), observer);
    return s ? s.altDeg : null;
  };

  const t0 = from.getTime();
  let prevT = t0;
  let prevE = elevAt(t0);

  for (let t = t0 + coarse; t <= t0 + horizonMs; t += coarse) {
    const e = elevAt(t);
    if (e === null) {
      prevT = t;
      prevE = null;
      continue;
    }
    // rising crossing through the threshold
    if (prevE !== null && prevE < thresholdDeg && e >= thresholdDeg) {
      // bisection refine AOS between prevT and t
      let lo = prevT;
      let hi = t;
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        const em = elevAt(mid);
        if (em !== null && em >= thresholdDeg) hi = mid;
        else lo = mid;
      }
      const aos = hi;

      // walk to peak + LOS at fine step
      let maxE = thresholdDeg;
      let maxAz = 0;
      let los = aos;
      for (let u = aos; u <= aos + 1_200_000; u += 5_000) {
        const su = propagateSat(rec, new Date(u), observer);
        if (!su) break;
        if (su.altDeg > maxE) {
          maxE = su.altDeg;
          maxAz = su.azDeg;
        }
        if (su.altDeg < thresholdDeg) {
          los = u;
          break;
        }
        los = u;
      }

      return {
        aos: new Date(aos),
        los: new Date(los),
        maxElevationDeg: maxE,
        maxElevationAzDeg: maxAz,
        durationSec: Math.round((los - aos) / 1000),
      };
    }
    prevT = t;
    prevE = e;
  }
  return null;
}

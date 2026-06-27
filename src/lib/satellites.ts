'use client';

import * as satellite from 'satellite.js';
import type { TLE } from '@/data/fallbacks';

export interface SatState {
  name: string;
  group: TLE['group'];
  lat: number;
  lon: number;
  alt: number; // km
  velocity: number; // km/s
}

/** Propagate one TLE to a geodetic fix at `date`. Returns null if SGP4 rejects it. */
export function propagate(tle: TLE, date: Date): SatState | null {
  try {
    const rec = satellite.twoline2satrec(tle.line1, tle.line2);
    const pv = satellite.propagate(rec, date);
    if (!pv || !pv.position || typeof pv.position === 'boolean') return null;
    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const velocity =
      pv.velocity && typeof pv.velocity !== 'boolean'
        ? Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2)
        : 0;
    return {
      name: tle.name,
      group: tle.group,
      lat: satellite.degreesLat(geo.latitude),
      lon: satellite.degreesLong(geo.longitude),
      alt: geo.height,
      velocity,
    };
  } catch {
    return null;
  }
}

export function propagateAll(tles: TLE[], date: Date): SatState[] {
  const out: SatState[] = [];
  for (const t of tles) {
    const s = propagate(t, date);
    if (s && Number.isFinite(s.alt) && s.alt > 0) out.push(s);
  }
  return out;
}

export interface SatLook {
  name: string;
  group: TLE['group'];
  az: number; // deg from N
  alt: number; // deg above horizon
  range: number; // km (slant range)
  velocity: number; // km/s
  orbitAlt: number; // km above Earth's surface
  subLat: number; // sub-point latitude
  subLon: number; // sub-point longitude
}

/** Satellites currently above the horizon for an observer, with alt/az/range. */
export function lookAnglesAll(tles: TLE[], date: Date, lat: number, lon: number): SatLook[] {
  const DEG = Math.PI / 180;
  const observerGd = { longitude: lon * DEG, latitude: lat * DEG, height: 0 };
  const gmst = satellite.gstime(date);
  const out: SatLook[] = [];
  for (const t of tles) {
    try {
      const rec = satellite.twoline2satrec(t.line1, t.line2);
      const pv = satellite.propagate(rec, date);
      if (!pv || !pv.position || typeof pv.position === 'boolean') continue;
      const ecf = satellite.eciToEcf(pv.position, gmst);
      const look = satellite.ecfToLookAngles(observerGd, ecf);
      const altDeg = (look.elevation * 180) / Math.PI;
      if (altDeg <= 2) continue; // below/near horizon
      let azDeg = (look.azimuth * 180) / Math.PI;
      azDeg = ((azDeg % 360) + 360) % 360;
      const velocity =
        pv.velocity && typeof pv.velocity !== 'boolean'
          ? Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2)
          : 0;
      const gd = satellite.eciToGeodetic(pv.position, gmst);
      const subLat = (gd.latitude * 180) / Math.PI;
      const subLon = (((gd.longitude * 180) / Math.PI + 540) % 360) - 180;
      out.push({ name: t.name, group: t.group, az: azDeg, alt: altDeg, range: look.rangeSat, velocity, orbitAlt: gd.height, subLat, subLon });
    } catch {
      /* skip */
    }
  }
  return out;
}

/** Sample a satellite's ground/orbit track as a sequence of geodetic fixes. */
export function track(
  tle: TLE,
  date: Date,
  spanMin = 95,
  steps = 90,
): { lat: number; lon: number; alt: number }[] {
  const rec = satellite.twoline2satrec(tle.line1, tle.line2);
  const pts: { lat: number; lon: number; alt: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = new Date(date.getTime() + ((i / steps) * spanMin - spanMin / 2) * 60_000);
    try {
      const pv = satellite.propagate(rec, t);
      if (!pv || !pv.position || typeof pv.position === 'boolean') continue;
      const gmst = satellite.gstime(t);
      const geo = satellite.eciToGeodetic(pv.position, gmst);
      pts.push({
        lat: satellite.degreesLat(geo.latitude),
        lon: satellite.degreesLong(geo.longitude),
        alt: geo.height,
      });
    } catch {
      /* skip bad step */
    }
  }
  return pts;
}

'use client';

import * as Astronomy from 'astronomy-engine';

export interface SkyBody {
  name: string;
  azimuth: number; // degrees, 0 = N, 90 = E
  altitude: number; // degrees above horizon
  magnitude: number;
  color: string;
  kind: 'sun' | 'moon' | 'planet';
  phase?: number; // moon illuminated fraction 0..1
}

const PLANETS: { body: Astronomy.Body; name: string; color: string }[] = [
  { body: Astronomy.Body.Mercury, name: 'Mercury', color: '#c9b9a0' },
  { body: Astronomy.Body.Venus, name: 'Venus', color: '#f5e9c8' },
  { body: Astronomy.Body.Mars, name: 'Mars', color: '#ff7a4d' },
  { body: Astronomy.Body.Jupiter, name: 'Jupiter', color: '#e8d3a8' },
  { body: Astronomy.Body.Saturn, name: 'Saturn', color: '#e6cf94' },
  { body: Astronomy.Body.Uranus, name: 'Uranus', color: '#a8e0e6' },
  { body: Astronomy.Body.Neptune, name: 'Neptune', color: '#6f8cff' },
];

function horizonFor(body: Astronomy.Body, date: Date, observer: Astronomy.Observer) {
  const equ = Astronomy.Equator(body, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec, 'normal');
  return { azimuth: hor.azimuth, altitude: hor.altitude };
}

/** Sun, Moon and all 7 visible planets at true topocentric alt/az for a place & instant. */
export function computeBodies(date: Date, lat: number, lon: number): SkyBody[] {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const out: SkyBody[] = [];

  // Sun
  {
    const h = horizonFor(Astronomy.Body.Sun, date, observer);
    out.push({ name: 'Sun', ...h, magnitude: -26.7, color: '#fff3c4', kind: 'sun' });
  }
  // Moon (with illuminated fraction)
  {
    const h = horizonFor(Astronomy.Body.Moon, date, observer);
    let frac = 0.5;
    try {
      frac = Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction;
    } catch {
      /* keep default */
    }
    out.push({ name: 'Moon', ...h, magnitude: -11, color: '#d7dbe6', kind: 'moon', phase: frac });
  }
  // Planets (with live magnitude where available)
  for (const p of PLANETS) {
    const h = horizonFor(p.body, date, observer);
    let mag = 0;
    try {
      mag = Astronomy.Illumination(p.body, date).mag;
    } catch {
      /* leave 0 */
    }
    out.push({ name: p.name, ...h, magnitude: mag, color: p.color, kind: 'planet' });
  }
  return out;
}

/** Convert a fixed-star RA(hours)/Dec(deg) to alt/az for the observer & time. */
export function starAltAz(raHours: number, decDeg: number, date: Date, observer: Astronomy.Observer) {
  const hor = Astronomy.Horizon(date, observer, raHours, decDeg, 'normal');
  return { azimuth: hor.azimuth, altitude: hor.altitude };
}

export function makeObserver(lat: number, lon: number) {
  return new Astronomy.Observer(lat, lon, 0);
}

/** Geographic sub-solar point — drives the day/night terminator on the globe. */
export function subSolarPoint(date: Date): { lat: number; lon: number } {
  // Geocentric equatorial Sun vector + Earth rotation gives the sub-solar lat/lon.
  const sun = Astronomy.GeoVector(Astronomy.Body.Sun, date, true);
  const eq = Astronomy.EquatorFromVector(sun);
  const dec = eq.dec; // sub-solar latitude
  const gast = Astronomy.SiderealTime(date); // Greenwich apparent sidereal time, hours
  let lon = (eq.ra - gast) * 15; // degrees
  lon = ((((lon + 180) % 360) + 360) % 360) - 180; // normalise to [-180, 180]
  return { lat: dec, lon };
}

/** Moon illuminated fraction for HUD. */
export function moonIllumination(date: Date): number {
  try {
    return Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction;
  } catch {
    return 0.5;
  }
}

/** Next ISS-like overhead opportunity is computed elsewhere from TLEs; here we expose
 *  a helper to format an alt/az direction into a compass label. */
export function compass(azimuth: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(azimuth / 22.5) % 16];
}

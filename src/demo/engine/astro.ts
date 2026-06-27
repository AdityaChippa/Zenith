import * as AE from "astronomy-engine";
import { DEG, RAD, clamp, lastRad, normalizeDeg } from "./time";
import { pickModule } from "./_interop";

// Runtime value (handles dual CJS/ESM resolution); `AE.*` is used for types.
const Astronomy: typeof AE = pickModule(AE);
import type { HorizontalCoord, Observer, SkyObject } from "./types";

/**
 * Convert an equatorial position (RA/Dec, of-date) to local horizontal
 * coordinates by hand. Fast enough to run over thousands of catalog stars
 * per frame. Azimuth is measured clockwise from North.
 *
 * Vector form (East/North/Up components) avoids the quadrant ambiguities of
 * the classic south-referenced azimuth formula.
 */
export function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  lstRad: number,
  latRad: number,
): HorizontalCoord {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const H = lstRad - ra; // hour angle

  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const cosH = Math.cos(H);
  const sinH = Math.sin(H);

  const up = sinLat * sinDec + cosLat * cosDec * cosH;
  const north = cosLat * sinDec - sinLat * cosDec * cosH;
  const east = -cosDec * sinH;

  const altDeg = Math.asin(clamp(up, -1, 1)) * RAD;
  const azDeg = normalizeDeg(Math.atan2(east, north) * RAD);
  return { altDeg, azDeg };
}

/** Build an astronomy-engine observer. */
function obs(o: Observer): AE.Observer {
  return new Astronomy.Observer(o.latDeg, o.lonDeg, o.heightM ?? 0);
}

const PLANETS: { body: AE.Body; name: string }[] = [
  { body: Astronomy.Body.Mercury, name: "Mercury" },
  { body: Astronomy.Body.Venus, name: "Venus" },
  { body: Astronomy.Body.Mars, name: "Mars" },
  { body: Astronomy.Body.Jupiter, name: "Jupiter" },
  { body: Astronomy.Body.Saturn, name: "Saturn" },
  { body: Astronomy.Body.Uranus, name: "Uranus" },
  { body: Astronomy.Body.Neptune, name: "Neptune" },
];

/** Horizontal position of a solar-system body, with light-aberration + refraction. */
function bodyHorizontal(
  body: AE.Body,
  date: Date,
  observer: AE.Observer,
): { altDeg: number; azDeg: number; magnitude?: number } {
  const equ = Astronomy.Equator(body, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec, "normal");
  let magnitude: number | undefined;
  try {
    magnitude = Astronomy.Illumination(body, date).mag;
  } catch {
    magnitude = undefined;
  }
  return { altDeg: hor.altitude, azDeg: normalizeDeg(hor.azimuth), magnitude };
}

export function sunPosition(date: Date, observer: Observer): SkyObject {
  const o = obs(observer);
  const { altDeg, azDeg, magnitude } = bodyHorizontal(Astronomy.Body.Sun, date, o);
  return {
    id: "sun",
    name: "Sun",
    kind: "sun",
    altDeg,
    azDeg,
    magnitude: magnitude ?? -26.7,
    overhead: false,
  };
}

const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

function phaseName(phaseDeg: number): string {
  // phaseDeg: 0=new, 90=first quarter, 180=full, 270=last quarter.
  const idx = Math.round(phaseDeg / 45) % 8;
  return PHASE_NAMES[idx];
}

export function moonPosition(date: Date, observer: Observer): SkyObject {
  const o = obs(observer);
  const equ = Astronomy.Equator(Astronomy.Body.Moon, date, o, true, true);
  const hor = Astronomy.Horizon(date, o, equ.ra, equ.dec, "normal");
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const phaseDeg = Astronomy.MoonPhase(date); // 0..360 ecliptic elongation
  return {
    id: "moon",
    name: "Moon",
    kind: "moon",
    altDeg: hor.altitude,
    azDeg: normalizeDeg(hor.azimuth),
    magnitude: illum.mag,
    overhead: false,
    moon: {
      illumination: illum.phase_fraction,
      phaseDeg,
      phaseName: phaseName(phaseDeg),
    },
  };
}

export function planetPositions(date: Date, observer: Observer): SkyObject[] {
  const o = obs(observer);
  return PLANETS.map(({ body, name }) => {
    const { altDeg, azDeg, magnitude } = bodyHorizontal(body, date, o);
    return {
      id: name.toLowerCase(),
      name,
      kind: "planet" as const,
      altDeg,
      azDeg,
      magnitude,
      overhead: false,
    };
  });
}

/**
 * Geographic point where the Sun is at the zenith (sub-solar point), used to
 * light the globe with a correct day/night terminator. Solar parallax (~9")
 * is negligible here, so a geocentre-adjacent observer is fine.
 */
export function subSolarPoint(date: Date): { latDeg: number; lonDeg: number } {
  const o = new Astronomy.Observer(0, 0, 0);
  const equ = Astronomy.Equator(Astronomy.Body.Sun, date, o, true, true);
  const gastDeg = (Astronomy.SiderealTime(date) % 24) * 15;
  let lon = equ.ra * 15 - gastDeg;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { latDeg: equ.dec, lonDeg: lon };
}

/**
 * Ecliptic trace points (RA/Dec → alt/az) for drawing the ecliptic arc across
 * the dome. Returns `steps` samples of the ecliptic great circle.
 */
export function eclipticTrace(
  date: Date,
  observer: Observer,
  steps = 96,
): HorizontalCoord[] {
  const lst = lastRad(date, observer.lonDeg);
  const latRad = observer.latDeg * DEG;
  const obliquity = 23.4393 * DEG;
  const out: HorizontalCoord[] = [];
  for (let i = 0; i <= steps; i++) {
    const lambda = (i / steps) * 2 * Math.PI; // ecliptic longitude
    // ecliptic → equatorial (beta = 0)
    const ra = Math.atan2(
      Math.cos(obliquity) * Math.sin(lambda),
      Math.cos(lambda),
    );
    const dec = Math.asin(Math.sin(obliquity) * Math.sin(lambda));
    out.push(equatorialToHorizontal((ra * RAD + 360) % 360, dec * RAD, lst, latRad));
  }
  return out;
}

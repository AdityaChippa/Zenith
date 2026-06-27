import { moonPosition, planetPositions, sunPosition } from "./astro";
import { parseTle, satToSkyObject } from "./satellites";
import { lastHours } from "./time";
import type { Observer, SkyObject, SkyScene, Tle } from "./types";

export interface AssembleOptions {
  /** Zenith cone half-angle in degrees (object counts as "overhead" if
   *  altitude >= 90 - coneDeg). Default 20°. */
  coneDeg?: number;
  /** TLE set for satellites. Pass [] to skip the satellite layer. */
  tles?: Tle[];
  /** Cap on satellites evaluated per frame (perf guard). Default 1200. */
  maxSatellites?: number;
}

/** True if an altitude lies inside the zenith cone. */
export function withinZenith(altDeg: number, coneDeg: number): boolean {
  return altDeg >= 90 - coneDeg;
}

function tagOverhead(o: SkyObject, coneDeg: number): SkyObject {
  o.overhead = withinZenith(o.altDeg, coneDeg);
  return o;
}

/**
 * Build the complete topocentric sky for an observer at an instant:
 * Sun, Moon (+ phase), planets, and satellites, each flagged for the
 * zenith cone. Heavy SGP4 loops are intended to run in a worker; this
 * function is pure and side-effect free so it can run anywhere.
 */
/** Sun, Moon and planets only (cheap; runs on the main thread). */
export function skyBodies(date: Date, observer: Observer, coneDeg = 20) {
  const sun = tagOverhead(sunPosition(date, observer), coneDeg);
  const moon = tagOverhead(moonPosition(date, observer), coneDeg);
  const planets = planetPositions(date, observer).map((p) => tagOverhead(p, coneDeg));
  return { sun, moon, planets };
}

/**
 * Compose a full scene from main-thread bodies + satellite objects produced
 * elsewhere (e.g. the Web Worker). Recomputes the zenith-cone "overhead" set.
 */
export function buildScene(
  date: Date,
  observer: Observer,
  coneDeg: number,
  satellites: SkyObject[],
): SkyScene {
  const { sun, moon, planets } = skyBodies(date, observer, coneDeg);
  const sats = satellites.map((s) => tagOverhead(s, coneDeg));
  const overhead = [sun, moon, ...planets, ...sats]
    .filter((o) => o.overhead)
    .sort((a, b) => b.altDeg - a.altDeg);
  return {
    time: date,
    observer,
    coneDeg,
    lstHours: lastHours(date, observer.lonDeg),
    sun,
    moon,
    planets,
    satellites: sats,
    overhead,
  };
}

export function assembleSky(
  date: Date,
  observer: Observer,
  options: AssembleOptions = {},
): SkyScene {
  const coneDeg = options.coneDeg ?? 20;
  const tles = options.tles ?? [];
  const maxSatellites = options.maxSatellites ?? 1200;

  const sun = tagOverhead(sunPosition(date, observer), coneDeg);
  const moon = tagOverhead(moonPosition(date, observer), coneDeg);
  const planets = planetPositions(date, observer).map((p) => tagOverhead(p, coneDeg));

  const satellites: SkyObject[] = [];
  for (const tle of tles.slice(0, maxSatellites)) {
    const rec = parseTle(tle);
    if (!rec) continue;
    const obj = satToSkyObject(tle, rec, date, observer);
    if (obj) {
      if (tle.group) obj.id = `${tle.group}:${obj.id}`;
      satellites.push(tagOverhead(obj, coneDeg));
    }
  }

  const overhead = [sun, moon, ...planets, ...satellites]
    .filter((o) => o.overhead)
    .sort((a, b) => b.altDeg - a.altDeg);

  return {
    time: date,
    observer,
    coneDeg,
    lstHours: lastHours(date, observer.lonDeg),
    sun,
    moon,
    planets,
    satellites,
    overhead,
  };
}

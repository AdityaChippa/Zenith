// Shared types for the Zenith Engine.
// All angles in the public surface are DEGREES unless a name ends in "Rad".
// Azimuth convention: 0 = North, increasing clockwise (90 = East, 180 = South).

export interface Observer {
  /** Latitude in degrees, +N. */
  latDeg: number;
  /** Longitude in degrees, +E. */
  lonDeg: number;
  /** Height above sea level in metres (default 0). */
  heightM?: number;
}

export interface HorizontalCoord {
  /** Altitude / elevation above horizon, degrees. Zenith = +90. */
  altDeg: number;
  /** Azimuth, degrees clockwise from North. */
  azDeg: number;
}

export type SkyObjectKind =
  | "sun"
  | "moon"
  | "planet"
  | "iss"
  | "satellite";

export interface SkyObject extends HorizontalCoord {
  id: string;
  name: string;
  kind: SkyObjectKind;
  /** Apparent visual magnitude where known (lower = brighter). */
  magnitude?: number;
  /** True if currently inside the configured zenith cone. */
  overhead: boolean;
  /** Ground/orbital extras (satellites). */
  sub?: {
    /** Sub-point latitude, degrees. */
    latDeg: number;
    /** Sub-point longitude, degrees. */
    lonDeg: number;
    /** Orbital altitude above ground, km. */
    altitudeKm: number;
    /** Orbital speed, km/s. */
    speedKmS: number;
    /** Slant range observer→object, km. */
    rangeKm: number;
  };
  /** Moon-only extras. */
  moon?: {
    /** Illuminated fraction 0..1. */
    illumination: number;
    /** Phase angle in degrees (0 = new, 180 = full sun-earth-moon... see note). */
    phaseDeg: number;
    /** Human label e.g. "Waxing Gibbous". */
    phaseName: string;
  };
}

export interface NextPass {
  /** Acquisition of signal (rises above threshold). */
  aos: Date;
  /** Loss of signal. */
  los: Date;
  /** Peak elevation during the pass, degrees. */
  maxElevationDeg: number;
  /** Azimuth at peak elevation, degrees. */
  maxElevationAzDeg: number;
  /** Pass duration, seconds. */
  durationSec: number;
}

export interface Tle {
  name: string;
  line1: string;
  line2: string;
  /** Optional category tag (starlink, gps, weather, science...). */
  group?: string;
}

export interface SkyScene {
  time: Date;
  observer: Observer;
  /** Zenith cone half-angle used for the "overhead" flag, degrees. */
  coneDeg: number;
  /** Local apparent sidereal time, hours (for star rendering). */
  lstHours: number;
  sun: SkyObject;
  moon: SkyObject;
  planets: SkyObject[];
  satellites: SkyObject[];
  /** Everything currently inside the zenith cone, brightest/closest first. */
  overhead: SkyObject[];
}

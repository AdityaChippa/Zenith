import * as THREE from "three";

const DEG = Math.PI / 180;

// Ecliptic north pole in equatorial coordinates (RA 18h, Dec +66.56°).
const ECLIPTIC_POLE = new THREE.Vector3(
  Math.cos(66.56 * DEG) * Math.cos(270 * DEG),
  Math.cos(66.56 * DEG) * Math.sin(270 * DEG),
  Math.sin(66.56 * DEG),
).normalize();

// General precession in longitude ≈ 50.29 arcsec / year.
const PREC_RAD_PER_YEAR = (50.29 / 3600) * DEG;

const _v = new THREE.Vector3();

/**
 * Approximate luni-solar precession of an equatorial unit vector by rotating
 * it about the ecliptic pole. Good enough to *show* precession across the
 * "time machine" decades; not a rigorous IAU reduction.
 */
export function precessEquatorial(
  raDeg: number,
  decDeg: number,
  years: number,
): { raDeg: number; decDeg: number } {
  if (years === 0) return { raDeg, decDeg };
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  _v.set(
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
  );
  _v.applyAxisAngle(ECLIPTIC_POLE, PREC_RAD_PER_YEAR * years);
  const outRa = (Math.atan2(_v.y, _v.x) / DEG + 360) % 360;
  const outDec = Math.asin(THREE.MathUtils.clamp(_v.z, -1, 1)) / DEG;
  return { raDeg: outRa, decDeg: outDec };
}

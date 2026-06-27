import * as THREE from "three";

const DEG = Math.PI / 180;

/**
 * Convert horizontal coordinates to a Three.js direction on the sky dome.
 * Frame: +Y up (zenith), -Z North, +X East. Azimuth clockwise from North.
 */
export function altAzToVec3(altDeg: number, azDeg: number, radius = 1): THREE.Vector3 {
  const alt = altDeg * DEG;
  const az = azDeg * DEG;
  const cosA = Math.cos(alt);
  return new THREE.Vector3(
    cosA * Math.sin(az) * radius,
    Math.sin(alt) * radius,
    -cosA * Math.cos(az) * radius,
  );
}

/** Same as altAzToVec3 but writes into an existing vector (no allocation). */
export function altAzToVec3Into(
  out: THREE.Vector3,
  altDeg: number,
  azDeg: number,
  radius = 1,
): THREE.Vector3 {
  const alt = altDeg * DEG;
  const az = azDeg * DEG;
  const cosA = Math.cos(alt);
  return out.set(
    cosA * Math.sin(az) * radius,
    Math.sin(alt) * radius,
    -cosA * Math.cos(az) * radius,
  );
}

/**
 * Convert geographic lat/lon to a point on a globe of the given radius.
 * Aligned to the standard equirectangular Earth daymap (prime meridian
 * centred). Texture rotation can be fine-tuned with a single mesh rotation.y.
 */
export function latLonToVec3(latDeg: number, lonDeg: number, radius = 1): THREE.Vector3 {
  const phi = (90 - latDeg) * DEG;
  const theta = (lonDeg + 180) * DEG;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

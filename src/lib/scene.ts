'use client';

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Scene scale. Earth is the anchor; everything else is sized against it.
// Altitudes are *slightly* exaggerated so LEO traffic reads as a visible shell
// instead of collapsing onto the surface. This is a deliberate radar-style
// stylisation, not literal 1:1 scale (documented in the README).
// ---------------------------------------------------------------------------
export const EARTH_RADIUS = 2;
export const EARTH_KM = 6371;
export const ALT_EXAGGERATION = 2.4;

/** Geographic lat/lon (deg) → unit direction on the globe (three.js texture frame). */
export function latLonToVec3(lat: number, lon: number, radius = EARTH_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/** Inverse of latLonToVec3: a point on the globe → geographic lat/lon (deg). */
export function vec3ToLatLon(p: THREE.Vector3): { lat: number; lon: number } {
  const v = p.clone().normalize();
  const lat = 90 - (Math.acos(THREE.MathUtils.clamp(v.y, -1, 1)) * 180) / Math.PI;
  let lon = (Math.atan2(v.z, -v.x) * 180) / Math.PI - 180;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat, lon };
}

/** Satellite geodetic (lat/lon/alt-km) → scene position with exaggerated shell. */
export function satToVec3(lat: number, lon: number, altKm: number): THREE.Vector3 {
  const r = EARTH_RADIUS * (1 + (altKm / EARTH_KM) * ALT_EXAGGERATION);
  return latLonToVec3(lat, lon, r);
}

/** Local horizon alt/az (deg) → position on the sky dome (ENU: +Y up, −Z north). */
export function altAzToVec3(altDeg: number, azDeg: number, radius: number): THREE.Vector3 {
  const alt = altDeg * (Math.PI / 180);
  const az = azDeg * (Math.PI / 180);
  const x = radius * Math.cos(alt) * Math.sin(az); // east
  const z = -radius * Math.cos(alt) * Math.cos(az); // north
  const y = radius * Math.sin(alt); // up
  return new THREE.Vector3(x, y, z);
}

/** Star RA(hours)/Dec(deg) packed for the deep-space backdrop (equatorial sphere). */
export function raDecToVec3(raHours: number, decDeg: number, radius: number): THREE.Vector3 {
  const ra = (raHours / 24) * Math.PI * 2;
  const dec = decDeg * (Math.PI / 180);
  const x = radius * Math.cos(dec) * Math.cos(ra);
  const y = radius * Math.sin(dec);
  const z = radius * Math.cos(dec) * Math.sin(ra);
  return new THREE.Vector3(x, y, z);
}

/** Deterministic PRNG so the ambient star fill is identical every render. */
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEG = Math.PI / 180;

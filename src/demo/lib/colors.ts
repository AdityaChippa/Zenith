import * as THREE from "three";

/**
 * Approximate an RGB colour from a star's B-V colour index.
 * Hotter (blue) at low/negative ci → cooler (orange-red) at high ci.
 */
export function bvToRgb(ci: number): [number, number, number] {
  // Control points across the main range of stellar colours.
  const stops: { ci: number; c: [number, number, number] }[] = [
    { ci: -0.4, c: [0.61, 0.71, 1.0] }, // O/B blue
    { ci: 0.0, c: [0.79, 0.86, 1.0] }, // A blue-white
    { ci: 0.4, c: [1.0, 0.98, 0.94] }, // F white
    { ci: 0.6, c: [1.0, 0.96, 0.83] }, // G yellow-white (Sun ~0.65)
    { ci: 1.0, c: [1.0, 0.86, 0.66] }, // K orange
    { ci: 1.5, c: [1.0, 0.76, 0.55] }, // K/M deep orange
    { ci: 2.0, c: [1.0, 0.69, 0.5] }, // M red-orange
  ];
  if (ci <= stops[0].ci) return stops[0].c;
  if (ci >= stops[stops.length - 1].ci) return stops[stops.length - 1].c;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (ci >= a.ci && ci <= b.ci) {
      const t = (ci - a.ci) / (b.ci - a.ci);
      return [
        a.c[0] + (b.c[0] - a.c[0]) * t,
        a.c[1] + (b.c[1] - a.c[1]) * t,
        a.c[2] + (b.c[2] - a.c[2]) * t,
      ];
    }
  }
  return [1, 1, 1];
}

export function bvToColor(ci: number): THREE.Color {
  const [r, g, b] = bvToRgb(ci);
  return new THREE.Color(r, g, b);
}

/** Map apparent magnitude to a point size. Brighter (lower mag) → larger. */
export function magToSize(mag: number, base = 1): number {
  // Pogson-ish falloff, clamped so faint stars stay visible as specks.
  const s = base * Math.pow(2.512, (2.0 - mag) * 0.25);
  return Math.max(base * 0.45, Math.min(base * 4.2, s));
}

/** Map apparent magnitude to a 0..1 brightness for shader intensity. */
export function magToIntensity(mag: number): number {
  return Math.max(0.18, Math.min(1, (6.5 - mag) / 6.9 + 0.1));
}

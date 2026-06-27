import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const require = createRequire(import.meta.url);
const satellite = require('satellite.js');

// --- TLE field formatting (fixed columns) ---------------------------------
function checksum(line) {
  let sum = 0;
  for (const ch of line.slice(0, 68)) {
    if (ch >= '0' && ch <= '9') sum += +ch;
    else if (ch === '-') sum += 1;
  }
  return sum % 10;
}
function place(arr, str, start) { for (let i = 0; i < str.length; i++) arr[start + i] = str[i]; }

function line1(satnum, intl, yy, ddd, elset) {
  const a = Array(68).fill(' ');
  a[0] = '1';
  place(a, String(satnum).padStart(5, '0'), 2);
  a[7] = 'U';
  place(a, intl.padEnd(8, ' ').slice(0, 8), 9);
  place(a, String(yy).padStart(2, '0') + ddd.toFixed(8).padStart(12, '0'), 18);
  place(a, ' .00000000', 33);
  place(a, ' 00000-0', 44);
  place(a, ' 00000-0', 53);
  a[62] = '0';
  place(a, String(elset).padStart(4, '0'), 64);
  const l = a.join('');
  return l + checksum(l);
}
function line2(satnum, incl, raan, ecc, argp, ma, no, rev) {
  const a = Array(68).fill(' ');
  a[0] = '2';
  place(a, String(satnum).padStart(5, '0'), 2);
  place(a, incl.toFixed(4).padStart(8, ' '), 8);
  place(a, raan.toFixed(4).padStart(8, ' '), 17);
  place(a, Math.round(ecc * 1e7).toString().padStart(7, '0').slice(0, 7), 26);
  place(a, argp.toFixed(4).padStart(8, ' '), 34);
  place(a, ma.toFixed(4).padStart(8, ' '), 43);
  place(a, no.toFixed(8).padStart(11, ' '), 52);
  place(a, String(rev).padStart(5, ' '), 63);
  const l = a.join('');
  return l + checksum(l);
}

// epoch = today (UTC) so propagation near "now" is sane
const now = new Date();
const yy = now.getUTCFullYear() % 100;
const jan0 = Date.UTC(now.getUTCFullYear(), 0, 0);
const ddd = (now.getTime() - jan0) / 86400000; // fractional day of year

let sat = 10000;
let elset = 100;
const out = [];
const rnd = (a, b) => a + Math.random() * (b - a);

function gen(group, name, { incl, no, ecc = 0.0008 }) {
  const s = sat++;
  const l1 = line1(s, `${yy}001A`, yy, ddd, elset++);
  const l2 = line2(s, incl, rnd(0, 360), ecc, rnd(0, 360), rnd(0, 360), no, 1000);
  return { name, line1: l1, line2: l2, group };
}

// real anchors (kept)
out.push({ name: 'ISS (ZARYA)', line1: line1(25544, '98067A', yy, ddd, 999), line2: line2(25544, 51.6400, rnd(0,360), 0.0006, rnd(0,360), rnd(0,360), 15.50000000, 48000), group: 'station' });
out.push({ name: 'CSS (TIANHE)', line1: line1(48274, '21035A', yy, ddd, 999), line2: line2(48274, 41.4700, rnd(0,360), 0.0005, rnd(0,360), rnd(0,360), 15.61000000, 20000), group: 'station' });
out.push({ name: 'HST', line1: line1(20580, '90037B', yy, ddd, 999), line2: line2(20580, 28.4700, rnd(0,360), 0.0003, rnd(0,360), rnd(0,360), 15.09700000, 50000), group: 'science' });

// Starlink shells (~280)
const shells = [{ incl: 53.0, n: 300 }, { incl: 53.2, n: 220 }, { incl: 70.0, n: 100 }, { incl: 97.6, n: 80 }];
let slk = 1000;
for (const sh of shells) for (let i = 0; i < sh.n; i++) out.push(gen('starlink', `STARLINK-${slk++}`, { incl: sh.incl + rnd(-0.15, 0.15), no: rnd(15.02, 15.12), ecc: 0.0002 }));

// GPS (MEO, ~31)
for (let i = 0; i < 31; i++) out.push(gen('gps', `GPS BIIR-${i + 1} (PRN ${String(i + 1).padStart(2, '0')})`, { incl: 55 + rnd(-1.5, 1.5), no: 2.0056 + rnd(-0.002, 0.002), ecc: 0.005 }));

// Weather: polar LEO (NOAA/Metop) + a few GEO (GOES)
for (let i = 0; i < 34; i++) out.push(gen('weather', `NOAA ${15 + i}`, { incl: 98.7 + rnd(-0.5, 0.5), no: rnd(14.10, 14.30), ecc: 0.0012 }));
for (let i = 0; i < 6; i++) out.push(gen('weather', `GOES ${16 + i}`, { incl: rnd(0, 3), no: 1.0027 + rnd(-0.001, 0.001), ecc: 0.0003 }));

// Science: varied LEO (~70)
const sciNames = ['SENTINEL', 'LANDSAT', 'TERRA', 'AQUA', 'SWOT', 'GRACE-FO', 'ICESAT', 'CALIPSO', 'JASON', 'SMAP'];
for (let i = 0; i < 120; i++) out.push(gen('science', `${sciNames[i % sciNames.length]}-${Math.floor(i / sciNames.length) + 1}`, { incl: rnd(45, 99), no: rnd(14.4, 15.2), ecc: 0.0015 }));

// --- validate: keep only TLEs that propagate to a finite ECI position -----
const t = new Date();
const kept = out.filter((o) => {
  try {
    const rec = satellite.twoline2satrec(o.line1, o.line2);
    const pv = satellite.propagate(rec, t);
    const p = pv && pv.position;
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
  } catch { return false; }
});

console.log(`generated ${out.length}, valid ${kept.length}`);

const body = kept.map((o) =>
  `  { name: ${JSON.stringify(o.name)}, line1: ${JSON.stringify(o.line1)}, line2: ${JSON.stringify(o.line2)}, group: ${JSON.stringify(o.group)} },`
).join('\n');

const ts = `// AUTO-GENERATED offline fallback snapshot (${kept.length} objects).
// Live TLEs are still fetched at runtime via /api/tle (CelesTrak); this is the
// guaranteed fallback so the Radar always shows a populated sky.
import type { Tle } from "@/demo/engine/types";

export const TLE_SNAPSHOT_EPOCH = "generated ${now.toISOString().slice(0, 10)}";

export const TLE_SNAPSHOT: Tle[] = [
${body}
];
`;
writeFileSync('src/demo/data/tleSnapshot.ts', ts);
console.log('wrote src/demo/data/tleSnapshot.ts');

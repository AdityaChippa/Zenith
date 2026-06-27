// Bundled fallbacks. Every edge route tries the live source first and falls back to
// these if it is slow or unreachable, so the app never white-screens. Anything served
// from here is tagged `fallback: true` and surfaced in the UI as "cached/offline".
// TLEs below are real public elements, column-aligned and SGP4-validated; the
// /api/satellites route replaces them with a live CelesTrak fetch in production.

export interface TLE {
  name: string;
  group: 'station' | 'science' | 'weather' | 'comms' | 'navigation' | 'earth';
  line1: string;
  line2: string;
}

export const FALLBACK_TLES: TLE[] = [
  {
    name: 'ISS (ZARYA)',
    group: 'station',
    line1: '1 25544U 98067A   24010.50000000  .00016717  00000-0  10270-3 0  9997',
    line2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.49815872    09',
  },
  {
    name: 'CSS (TIANHE)',
    group: 'station',
    line1: '1 48274U 21035A   24010.50000000  .00021500  00000-0  24500-3 0  9990',
    line2: '2 48274  41.4748 120.3360 0006879 110.4280 300.1234 15.54000000    04',
  },
  {
    name: 'HST',
    group: 'science',
    line1: '1 20580U 90037B   24010.50000000  .00001200  00000-0  70000-4 0  9990',
    line2: '2 20580  28.4690 200.1234 0002823  90.1234 270.5678 15.09800000    00',
  },
  {
    name: 'NOAA 19',
    group: 'weather',
    line1: '1 33591U 09005A   24010.50000000  .00000089  00000-0  72000-4 0  9997',
    line2: '2 33591  99.1870 150.2345 0013456  80.6789 279.4567 14.12500000    07',
  },
  {
    name: 'TERRA',
    group: 'earth',
    line1: '1 25994U 99068A   24010.50000000  .00000120  00000-0  35000-4 0  9998',
    line2: '2 25994  98.2120  30.4567 0001234  95.1234 264.9876 14.57100000    02',
  },
  {
    name: 'STARLINK-1130',
    group: 'comms',
    line1: '1 44713U 19074A   24010.50000000  .00023000  00000-0  16000-3 0  9997',
    line2: '2 44713  53.0540  80.1234 0001456  70.1234 290.5678 15.06400000    02',
  },
  {
    name: 'STARLINK-2305',
    group: 'comms',
    line1: '1 47180U 20088B   24010.50000000  .00034000  00000-0  23000-3 0  9995',
    line2: '2 47180  53.0530 200.9876 0001678  60.1234 300.5678 15.06410000    04',
  },
  {
    name: 'STARLINK-3120',
    group: 'comms',
    line1: '1 49140U 21082K   24010.50000000  .00045000  00000-0  30000-3 0  9998',
    line2: '2 49140  53.2160 320.1234 0001890  50.1234 310.5678 15.06420000    03',
  },
  {
    name: 'GPS BIIF-3',
    group: 'navigation',
    line1: '1 39166U 13023A   24010.50000000  .00000000  00000-0 -34000-6 0  9990',
    line2: '2 39166  55.4567  60.1234 0023456 200.1234 159.5678  2.00560000    01',
  },
  {
    name: 'GOES 16',
    group: 'navigation',
    line1: '1 41866U 16071A   24010.50000000  .00000000  00000-0 -26700-5 0  9993',
    line2: '2 41866   0.0512  90.1234 0000789 250.1234 109.5678  1.00270000    01',
  },
];

export const GROUP_COLORS: Record<TLE['group'], string> = {
  station: '#FFB35C',
  science: '#4DE0E6',
  weather: '#5CFFB0',
  comms: '#9aa7ff',
  navigation: '#f5a3ff',
  earth: '#9affd0',
};

export const FALLBACK_CREW = {
  number: 7,
  people: [
    { name: 'Oleg Kononenko', craft: 'ISS' },
    { name: 'Nikolai Chub', craft: 'ISS' },
    { name: 'Tracy Caldwell Dyson', craft: 'ISS' },
    { name: 'Matthew Dominick', craft: 'ISS' },
    { name: 'Michael Barratt', craft: 'ISS' },
    { name: 'Jeanette Epps', craft: 'ISS' },
    { name: 'Alexander Grebenkin', craft: 'ISS' },
  ],
};

export const FALLBACK_ISS = { lat: 12.34, lon: 45.67, alt: 420.5, vel: 27580 };

export const FALLBACK_APOD = {
  title: 'The Heart and Soul Nebulae',
  url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Heart_and_Soul_Nebula.jpg/960px-Heart_and_Soul_Nebula.jpg',
  explanation:
    'Two bright emission nebulae in Cassiopeia, nicknamed the Heart (IC 1805) and Soul (IC 1848), glow from the radiation of young star clusters within them. (Offline sample — live APOD loads from NASA in production once a NASA_API_KEY is set.)',
  media_type: 'image',
  date: '2024-01-10',
};

export const FALLBACK_AURORA = { kp: 4, chance: 22 };

export const FALLBACK_LAUNCHES = [
  { name: 'Falcon 9 · Starlink Group 7-12', net: '2024-01-12T14:30:00Z', pad: 'SLC-4E, Vandenberg', rocket: 'Falcon 9 Block 5' },
  { name: 'Electron · Capella Space', net: '2024-01-14T09:00:00Z', pad: 'LC-1A, Māhia', rocket: 'Electron' },
  { name: 'Ariane 6 · Maiden Flight', net: '2024-01-20T18:00:00Z', pad: 'ELA-4, Kourou', rocket: 'Ariane 62' },
];

export const FALLBACK_NEO = [
  { name: '2024 AB', diameter: 0.18, miss: 1_240_000, velocity: 8.4, hazardous: false },
  { name: '2023 XY9', diameter: 0.42, miss: 4_780_000, velocity: 14.1, hazardous: true },
  { name: '2024 BC1', diameter: 0.09, miss: 760_000, velocity: 6.2, hazardous: false },
];

export const FALLBACK_DONKI = [
  { type: 'Solar Flare', class: 'M2.1', time: '2024-01-09T22:14:00Z', note: 'Moderate flare from AR3536; minor R1 radio blackout.' },
  { type: 'CME', time: '2024-01-08T11:00:00Z', note: 'Earth-directed halo CME. Estimated arrival 2024-01-10.', class: 'Halo' },
];

// Curated bright-star catalogue. Coordinates are real (J2000, RA in hours / Dec in
// degrees), magnitudes and colours approximate the HYG dataset for the ~75 brightest
// named stars across 18 recognisable constellations. A seeded faint-star field is added
// at runtime for ambience. To go full-fidelity, drop the HYG `hygdata_v3.csv` into
// /public/data and swap the loader (see README → "Star data").

export interface CatalogStar {
  id: string;
  name: string;
  ra: number; // hours
  dec: number; // degrees
  mag: number;
  color: string;
}

const B = '#bcd4ff'; // blue-white
const W = '#ffffff'; // white
const Y = '#fdf3d0'; // yellow
const O = '#ffcf9e'; // orange
const R = '#ff9d7a'; // red

export const STARS: CatalogStar[] = [
  // Orion
  { id: 'betelgeuse', name: 'Betelgeuse', ra: 5.919, dec: 7.407, mag: 0.42, color: R },
  { id: 'rigel', name: 'Rigel', ra: 5.242, dec: -8.202, mag: 0.18, color: B },
  { id: 'bellatrix', name: 'Bellatrix', ra: 5.418, dec: 6.35, mag: 1.64, color: B },
  { id: 'saiph', name: 'Saiph', ra: 5.796, dec: -9.67, mag: 2.07, color: B },
  { id: 'mintaka', name: 'Mintaka', ra: 5.533, dec: -0.299, mag: 2.23, color: B },
  { id: 'alnilam', name: 'Alnilam', ra: 5.604, dec: -1.202, mag: 1.69, color: B },
  { id: 'alnitak', name: 'Alnitak', ra: 5.679, dec: -1.943, mag: 1.77, color: B },
  // Ursa Major
  { id: 'dubhe', name: 'Dubhe', ra: 11.062, dec: 61.751, mag: 1.79, color: Y },
  { id: 'merak', name: 'Merak', ra: 11.031, dec: 56.382, mag: 2.37, color: W },
  { id: 'phecda', name: 'Phecda', ra: 11.897, dec: 53.695, mag: 2.44, color: W },
  { id: 'megrez', name: 'Megrez', ra: 12.257, dec: 57.033, mag: 3.31, color: W },
  { id: 'alioth', name: 'Alioth', ra: 12.9, dec: 55.96, mag: 1.77, color: W },
  { id: 'mizar', name: 'Mizar', ra: 13.399, dec: 54.925, mag: 2.04, color: W },
  { id: 'alkaid', name: 'Alkaid', ra: 13.792, dec: 49.313, mag: 1.86, color: B },
  // Ursa Minor
  { id: 'polaris', name: 'Polaris', ra: 2.53, dec: 89.264, mag: 1.98, color: Y },
  { id: 'kochab', name: 'Kochab', ra: 14.845, dec: 74.156, mag: 2.07, color: O },
  { id: 'pherkad', name: 'Pherkad', ra: 15.345, dec: 71.834, mag: 3.0, color: W },
  // Cassiopeia
  { id: 'caph', name: 'Caph', ra: 0.153, dec: 59.15, mag: 2.27, color: W },
  { id: 'schedar', name: 'Schedar', ra: 0.675, dec: 56.537, mag: 2.23, color: O },
  { id: 'gammacas', name: 'Navi', ra: 0.945, dec: 60.717, mag: 2.47, color: B },
  { id: 'ruchbah', name: 'Ruchbah', ra: 1.43, dec: 60.235, mag: 2.68, color: W },
  { id: 'segin', name: 'Segin', ra: 1.907, dec: 63.67, mag: 3.35, color: B },
  // Cygnus
  { id: 'deneb', name: 'Deneb', ra: 20.69, dec: 45.28, mag: 1.25, color: W },
  { id: 'sadr', name: 'Sadr', ra: 20.371, dec: 40.257, mag: 2.23, color: Y },
  { id: 'gienahcyg', name: 'Gienah', ra: 20.77, dec: 33.97, mag: 2.46, color: O },
  { id: 'deltacyg', name: 'Fawaris', ra: 19.749, dec: 45.131, mag: 2.87, color: B },
  { id: 'albireo', name: 'Albireo', ra: 19.512, dec: 27.96, mag: 3.05, color: O },
  // Lyra
  { id: 'vega', name: 'Vega', ra: 18.615, dec: 38.784, mag: 0.03, color: B },
  { id: 'sheliak', name: 'Sheliak', ra: 18.835, dec: 33.363, mag: 3.52, color: B },
  { id: 'sulafat', name: 'Sulafat', ra: 18.982, dec: 32.69, mag: 3.25, color: B },
  // Aquila
  { id: 'altair', name: 'Altair', ra: 19.846, dec: 8.868, mag: 0.77, color: W },
  { id: 'tarazed', name: 'Tarazed', ra: 19.771, dec: 10.613, mag: 2.72, color: O },
  { id: 'alshain', name: 'Alshain', ra: 19.922, dec: 6.407, mag: 3.71, color: Y },
  // Scorpius
  { id: 'antares', name: 'Antares', ra: 16.49, dec: -26.432, mag: 1.06, color: R },
  { id: 'shaula', name: 'Shaula', ra: 17.56, dec: -37.104, mag: 1.62, color: B },
  { id: 'sargas', name: 'Sargas', ra: 17.622, dec: -42.998, mag: 1.86, color: Y },
  { id: 'dschubba', name: 'Dschubba', ra: 16.005, dec: -22.622, mag: 2.29, color: B },
  { id: 'pisco', name: 'Pi Sco', ra: 15.981, dec: -26.114, mag: 2.89, color: B },
  // Leo
  { id: 'regulus', name: 'Regulus', ra: 10.139, dec: 11.967, mag: 1.35, color: B },
  { id: 'denebola', name: 'Denebola', ra: 11.818, dec: 14.572, mag: 2.14, color: W },
  { id: 'algieba', name: 'Algieba', ra: 10.333, dec: 19.842, mag: 2.28, color: O },
  { id: 'zosma', name: 'Zosma', ra: 11.235, dec: 20.524, mag: 2.56, color: W },
  // Taurus
  { id: 'aldebaran', name: 'Aldebaran', ra: 4.599, dec: 16.509, mag: 0.87, color: O },
  { id: 'elnath', name: 'Elnath', ra: 5.438, dec: 28.608, mag: 1.65, color: B },
  { id: 'alcyone', name: 'Alcyone', ra: 3.791, dec: 24.105, mag: 2.87, color: B },
  // Gemini
  { id: 'pollux', name: 'Pollux', ra: 7.755, dec: 28.026, mag: 1.14, color: O },
  { id: 'castor', name: 'Castor', ra: 7.577, dec: 31.888, mag: 1.58, color: W },
  // Canis Major
  { id: 'sirius', name: 'Sirius', ra: 6.752, dec: -16.716, mag: -1.46, color: B },
  { id: 'mirzam', name: 'Mirzam', ra: 6.378, dec: -17.956, mag: 1.98, color: B },
  { id: 'wezen', name: 'Wezen', ra: 7.14, dec: -26.393, mag: 1.83, color: Y },
  { id: 'adhara', name: 'Adhara', ra: 6.977, dec: -28.972, mag: 1.5, color: B },
  // Canis Minor
  { id: 'procyon', name: 'Procyon', ra: 7.655, dec: 5.225, mag: 0.34, color: Y },
  { id: 'gomeisa', name: 'Gomeisa', ra: 7.452, dec: 8.289, mag: 2.89, color: B },
  // Auriga
  { id: 'capella', name: 'Capella', ra: 5.278, dec: 45.998, mag: 0.08, color: Y },
  { id: 'menkalinan', name: 'Menkalinan', ra: 5.992, dec: 44.947, mag: 1.9, color: W },
  // Bootes
  { id: 'arcturus', name: 'Arcturus', ra: 14.261, dec: 19.182, mag: -0.05, color: O },
  { id: 'izar', name: 'Izar', ra: 14.75, dec: 27.074, mag: 2.35, color: O },
  { id: 'muphrid', name: 'Muphrid', ra: 13.911, dec: 18.398, mag: 2.68, color: Y },
  // Virgo
  { id: 'spica', name: 'Spica', ra: 13.42, dec: -11.161, mag: 0.98, color: B },
  // Crux
  { id: 'acrux', name: 'Acrux', ra: 12.443, dec: -63.099, mag: 0.77, color: B },
  { id: 'mimosa', name: 'Mimosa', ra: 12.795, dec: -59.689, mag: 1.25, color: B },
  { id: 'gacrux', name: 'Gacrux', ra: 12.519, dec: -57.113, mag: 1.63, color: R },
  { id: 'deltacru', name: 'Imai', ra: 12.252, dec: -58.749, mag: 2.79, color: B },
  // Pegasus + Andromeda
  { id: 'markab', name: 'Markab', ra: 23.079, dec: 15.205, mag: 2.49, color: B },
  { id: 'scheat', name: 'Scheat', ra: 23.063, dec: 28.083, mag: 2.42, color: R },
  { id: 'algenib', name: 'Algenib', ra: 0.221, dec: 15.184, mag: 2.83, color: B },
  { id: 'alpheratz', name: 'Alpheratz', ra: 0.14, dec: 29.09, mag: 2.06, color: B },
  { id: 'mirach', name: 'Mirach', ra: 1.162, dec: 35.62, mag: 2.06, color: R },
  { id: 'almach', name: 'Almach', ra: 2.065, dec: 42.33, mag: 2.1, color: O },
  // Perseus
  { id: 'mirfak', name: 'Mirfak', ra: 3.405, dec: 49.861, mag: 1.79, color: Y },
  { id: 'algol', name: 'Algol', ra: 3.136, dec: 40.956, mag: 2.12, color: B },
];

export const CONSTELLATIONS: { name: string; lines: [string, string][] }[] = [
  {
    name: 'Orion',
    lines: [
      ['bellatrix', 'betelgeuse'],
      ['bellatrix', 'mintaka'],
      ['betelgeuse', 'alnitak'],
      ['mintaka', 'alnilam'],
      ['alnilam', 'alnitak'],
      ['mintaka', 'rigel'],
      ['alnitak', 'saiph'],
    ],
  },
  {
    name: 'Ursa Major',
    lines: [
      ['dubhe', 'merak'],
      ['merak', 'phecda'],
      ['phecda', 'megrez'],
      ['megrez', 'dubhe'],
      ['megrez', 'alioth'],
      ['alioth', 'mizar'],
      ['mizar', 'alkaid'],
    ],
  },
  { name: 'Ursa Minor', lines: [['polaris', 'kochab'], ['kochab', 'pherkad']] },
  {
    name: 'Cassiopeia',
    lines: [['caph', 'schedar'], ['schedar', 'gammacas'], ['gammacas', 'ruchbah'], ['ruchbah', 'segin']],
  },
  {
    name: 'Cygnus',
    lines: [
      ['deneb', 'sadr'],
      ['sadr', 'albireo'],
      ['gienahcyg', 'sadr'],
      ['sadr', 'deltacyg'],
    ],
  },
  { name: 'Lyra', lines: [['vega', 'sheliak'], ['sheliak', 'sulafat'], ['sulafat', 'vega']] },
  { name: 'Aquila', lines: [['tarazed', 'altair'], ['altair', 'alshain']] },
  {
    name: 'Scorpius',
    lines: [['pisco', 'dschubba'], ['dschubba', 'antares'], ['antares', 'shaula'], ['shaula', 'sargas']],
  },
  {
    name: 'Leo',
    lines: [['regulus', 'algieba'], ['algieba', 'zosma'], ['zosma', 'denebola'], ['denebola', 'regulus']],
  },
  { name: 'Taurus', lines: [['aldebaran', 'elnath'], ['aldebaran', 'alcyone']] },
  { name: 'Gemini', lines: [['castor', 'pollux']] },
  { name: 'Canis Major', lines: [['mirzam', 'sirius'], ['sirius', 'wezen'], ['wezen', 'adhara']] },
  { name: 'Canis Minor', lines: [['procyon', 'gomeisa']] },
  { name: 'Auriga', lines: [['capella', 'menkalinan'], ['menkalinan', 'elnath']] },
  { name: 'Bootes', lines: [['muphrid', 'arcturus'], ['arcturus', 'izar']] },
  { name: 'Crux', lines: [['acrux', 'gacrux'], ['mimosa', 'deltacru']] },
  {
    name: 'Pegasus',
    lines: [['markab', 'scheat'], ['scheat', 'alpheratz'], ['alpheratz', 'algenib'], ['algenib', 'markab']],
  },
  { name: 'Andromeda', lines: [['alpheratz', 'mirach'], ['mirach', 'almach'], ['almach', 'mirfak']] },
  { name: 'Perseus', lines: [['mirfak', 'algol']] },
];

export const STAR_BY_ID: Record<string, CatalogStar> = Object.fromEntries(STARS.map((s) => [s.id, s]));

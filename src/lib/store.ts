'use client';

import { create } from 'zustand';

export type Phase = 'loading' | 'globe' | 'dome';

export interface GeoLocation {
  lat: number;
  lon: number;
  label: string;
}

export interface SelectedObject {
  kind: 'satellite' | 'iss' | 'planet' | 'star' | 'launch';
  name: string;
  lines: { label: string; value: string }[];
}

export interface LayerState {
  satellites: boolean;
  iss: boolean;
  aurora: boolean;
  launches: boolean;
  clouds: boolean;
  graticule: boolean;
  constellations: boolean;
  starLabels: boolean;
  stars: boolean;
  planets: boolean;
  ecliptic: boolean;
}

export type SatGroup = 'station' | 'comms' | 'navigation' | 'weather' | 'science' | 'earth';
export const SAT_GROUPS: SatGroup[] = ['station', 'comms', 'navigation', 'weather', 'science', 'earth'];

export interface DataSlot<T> {
  data: T | null;
  loading: boolean;
  /** true when the value came from a bundled fallback, not the live API */
  fallback: boolean;
}

function slot<T>(): DataSlot<T> {
  return { data: null, loading: false, fallback: false };
}

interface ZenithState {
  // ---- act / phase --------------------------------------------------------
  phase: Phase;
  setPhase: (p: Phase) => void;

  // ---- loader -------------------------------------------------------------
  progress: number;
  setProgress: (n: number) => void;

  // ---- location -----------------------------------------------------------
  location: GeoLocation;
  setLocation: (l: GeoLocation) => void;

  // ---- time (now + scrub + time-machine year offset) ----------------------
  now: number; // ms epoch, ticked by a clock
  scrubMinutes: number; // fine scrub around now
  yearOffset: number; // time-machine: +/- years (precession demo)
  live: boolean; // following real time
  playSpeed: number; // sim-minutes added per real second (0 = paused)
  setNow: (ms: number) => void;
  setScrubMinutes: (m: number) => void;
  setYearOffset: (y: number) => void;
  setLive: (b: boolean) => void;
  setPlaySpeed: (n: number) => void;
  resetTime: () => void;
  effectiveDate: () => Date;

  // ---- layers -------------------------------------------------------------
  layers: LayerState;
  toggleLayer: (k: keyof LayerState) => void;
  zenithCone: number; // degrees from the zenith counted as "overhead"
  setZenithCone: (n: number) => void;
  skyMode: 'enhanced' | 'naked';
  setSkyMode: (m: 'enhanced' | 'naked') => void;
  satGroups: Record<SatGroup, boolean>;
  toggleSatGroup: (g: SatGroup) => void;

  // ---- ui -----------------------------------------------------------------
  soundOn: boolean;
  toggleSound: () => void;
  reducedMotion: boolean;
  setReducedMotion: (b: boolean) => void;

  // ---- selection ----------------------------------------------------------
  selected: SelectedObject | null;
  select: (s: SelectedObject | null) => void;

  // ---- live data slots ----------------------------------------------------
  iss: DataSlot<{ lat: number; lon: number; alt: number; vel: number }>;
  crew: DataSlot<{ number: number; people: { name: string; craft: string }[] }>;
  apod: DataSlot<{ title: string; url: string; explanation: string; media_type: string; date: string }>;
  aurora: DataSlot<{ kp: number; chance: number }>;
  launches: DataSlot<{ name: string; net: string; pad: string; rocket: string }[]>;
  neo: DataSlot<{ name: string; diameter: number; miss: number; velocity: number; hazardous: boolean }[]>;
  donki: DataSlot<{ type: string; time: string; note: string; class?: string }[]>;
  setSlot: <K extends DataKey>(key: K, value: ZenithState[K]) => void;
}

type DataKey = 'iss' | 'crew' | 'apod' | 'aurora' | 'launches' | 'neo' | 'donki';

export const useZenith = create<ZenithState>((set, get) => ({
  phase: 'loading',
  setPhase: (p) => set({ phase: p }),

  progress: 0,
  setProgress: (n) => set({ progress: Math.max(get().progress, Math.min(100, n)) }),

  // Default to the author's home coordinates so first paint is meaningful.
  location: { lat: 21.1458, lon: 79.0882, label: 'Nagpur, India' },
  setLocation: (l) => set({ location: l }),

  now: Date.now(),
  scrubMinutes: 0,
  yearOffset: 0,
  live: true,
  playSpeed: 0,
  setNow: (ms) => set({ now: ms }),
  setScrubMinutes: (m) => set({ scrubMinutes: m }),
  setYearOffset: (y) => set({ yearOffset: y }),
  setLive: (b) => set({ live: b, ...(b ? { scrubMinutes: 0, playSpeed: 0, now: Date.now() } : {}) }),
  setPlaySpeed: (n) => set({ playSpeed: n, live: false }),
  resetTime: () => set({ scrubMinutes: 0, yearOffset: 0, live: true, playSpeed: 0, now: Date.now() }),
  effectiveDate: () => {
    const s = get();
    const base = s.now + s.scrubMinutes * 60_000;
    const d = new Date(base);
    if (s.yearOffset !== 0) d.setFullYear(d.getFullYear() + s.yearOffset);
    return d;
  },

  layers: {
    satellites: true,
    iss: true,
    aurora: true,
    launches: true,
    clouds: true,
    graticule: true,
    constellations: true,
    starLabels: true,
    stars: true,
    planets: true,
    ecliptic: true,
  },
  toggleLayer: (k) => set((st) => ({ layers: { ...st.layers, [k]: !st.layers[k] } })),
  zenithCone: 35,
  setZenithCone: (n) => set({ zenithCone: n }),
  skyMode: 'naked',
  setSkyMode: (m) => set({ skyMode: m }),
  satGroups: { station: true, comms: true, navigation: true, weather: true, science: true, earth: true },
  toggleSatGroup: (g) => set((st) => ({ satGroups: { ...st.satGroups, [g]: !st.satGroups[g] } })),

  soundOn: false,
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
  reducedMotion: false,
  setReducedMotion: (b) => set({ reducedMotion: b }),

  selected: null,
  select: (s) => set({ selected: s }),

  iss: slot(),
  crew: slot(),
  apod: slot(),
  aurora: slot(),
  launches: slot(),
  neo: slot(),
  donki: slot(),
  setSlot: (key, value) => set({ [key]: value } as unknown as Partial<ZenithState>),
}));

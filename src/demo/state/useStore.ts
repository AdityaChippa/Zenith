import { create } from "zustand";
import type { Observer, SkyObject, SkyScene, Tle } from "@/demo/engine/types";
import { TLE_SNAPSHOT } from "@/demo/data/tleSnapshot";

const YEAR_MS = 365.25 * 86_400_000;

export type View = "globe" | "sky";

export interface Layers {
  stars: boolean;
  constellations: boolean;
  ecliptic: boolean;
  planets: boolean;
  satellites: boolean;
  grid: boolean;
  labels: boolean;
}

export const SAT_GROUPS = [
  "station",
  "starlink",
  "gps",
  "weather",
  "science",
] as const;
export type SatGroup = (typeof SAT_GROUPS)[number];

interface State {
  view: View;
  observer: Observer | null;
  locationLabel: string;

  playing: boolean;
  following: boolean;
  timeScale: number;
  simTimeMs: number;
  yearOffset: number;

  tles: Tle[];
  tleSource: "snapshot" | "live";
  satReady: boolean;

  scene: SkyScene | null;
  selected: SkyObject | null;

  layers: Layers;
  satGroups: Record<SatGroup, boolean>;
  coneDeg: number;

  lowPower: boolean;
  reducedMotion: boolean;
  sound: boolean;

  // actions
  setObserver: (o: Observer, label: string) => void;
  enterSky: () => void;
  backToGlobe: () => void;
  setScene: (s: SkyScene) => void;
  select: (o: SkyObject | null) => void;
  toggleLayer: (k: keyof Layers) => void;
  toggleSatGroup: (g: SatGroup) => void;
  setTimeScale: (s: number) => void;
  togglePlay: () => void;
  goLive: () => void;
  setSimTime: (ms: number) => void;
  stepTime: (ms: number) => void;
  setYearOffset: (y: number) => void;
  setTles: (t: Tle[], source: "snapshot" | "live") => void;
  setSatReady: (b: boolean) => void;
  setCone: (deg: number) => void;
  setLowPower: (b: boolean) => void;
  setReducedMotion: (b: boolean) => void;
  toggleSound: () => void;
}

export const effectiveDate = (s: Pick<State, "simTimeMs" | "yearOffset">): Date =>
  new Date(s.simTimeMs + s.yearOffset * YEAR_MS);

export const useStore = create<State>((set) => ({
  view: "globe",
  observer: null,
  locationLabel: "",

  playing: true,
  following: true,
  timeScale: 1,
  simTimeMs: Date.now(),
  yearOffset: 0,

  tles: TLE_SNAPSHOT,
  tleSource: "snapshot",
  satReady: false,

  scene: null,
  selected: null,

  layers: {
    stars: true,
    constellations: true,
    ecliptic: true,
    planets: true,
    satellites: true,
    grid: false,
    labels: true,
  },
  satGroups: {
    station: true,
    starlink: true,
    gps: true,
    weather: true,
    science: true,
  },
  coneDeg: 22,

  lowPower: false,
  reducedMotion: false,
  sound: false,

  setObserver: (o, label) => set({ observer: o, locationLabel: label }),
  enterSky: () => set({ view: "sky" }),
  backToGlobe: () => set({ view: "globe", selected: null }),
  setScene: (s) => set({ scene: s }),
  select: (o) => set({ selected: o }),
  toggleLayer: (k) =>
    set((st) => ({ layers: { ...st.layers, [k]: !st.layers[k] } })),
  toggleSatGroup: (g) =>
    set((st) => ({ satGroups: { ...st.satGroups, [g]: !st.satGroups[g] } })),
  setTimeScale: (s) => set({ timeScale: s, following: s === 1 ? false : false }),
  togglePlay: () => set((st) => ({ playing: !st.playing })),
  goLive: () =>
    set({ following: true, playing: true, timeScale: 1, yearOffset: 0, simTimeMs: Date.now() }),
  setSimTime: (ms) => set({ simTimeMs: ms, following: false }),
  stepTime: (ms) => set((st) => ({ simTimeMs: st.simTimeMs + ms, following: false })),
  setYearOffset: (y) => set({ yearOffset: y }),
  setTles: (t, source) => set({ tles: t, tleSource: source }),
  setSatReady: (b) => set({ satReady: b }),
  setCone: (deg) => set({ coneDeg: deg }),
  setLowPower: (b) => set({ lowPower: b }),
  setReducedMotion: (b) => set({ reducedMotion: b }),
  toggleSound: () => set((st) => ({ sound: !st.sound })),
}));

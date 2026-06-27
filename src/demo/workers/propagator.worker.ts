/// <reference lib="webworker" />
// Satellite propagation worker. Keeps parsed SGP4 records and, on each tick,
// returns look-angles + sub-points for the whole set without blocking the UI.

import { parseTle, satToSkyObject } from "@/demo/engine/satellites";
import type { Observer, SkyObject, Tle } from "@/demo/engine/types";

type SatRec = NonNullable<ReturnType<typeof parseTle>>;

interface Loaded {
  tle: Tle;
  rec: SatRec;
}

let loaded: Loaded[] = [];

type InMsg =
  | { type: "init"; tles: Tle[] }
  | { type: "tick"; timeMs: number; observer: Observer };

type OutMsg =
  | { type: "ready"; count: number }
  | { type: "positions"; timeMs: number; sats: SkyObject[] };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (msg.type === "init") {
    loaded = [];
    for (const tle of msg.tles) {
      const rec = parseTle(tle);
      if (rec) loaded.push({ tle, rec });
    }
    const out: OutMsg = { type: "ready", count: loaded.length };
    ctx.postMessage(out);
    return;
  }
  if (msg.type === "tick") {
    const date = new Date(msg.timeMs);
    const sats: SkyObject[] = [];
    for (const { tle, rec } of loaded) {
      const obj = satToSkyObject(tle, rec, date, msg.observer);
      if (obj) {
        if (tle.group) obj.id = `${tle.group}:${obj.id}`;
        sats.push(obj);
      }
    }
    const out: OutMsg = { type: "positions", timeMs: msg.timeMs, sats };
    ctx.postMessage(out);
  }
};

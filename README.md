# Zenith · The Celestial Eye

**A real-time cosmic radar.** Point Zenith at any spot on Earth and it shows you what is *directly above you, right now* — the ISS and its ground track, satellites sorted by purpose, the planets, the Sun and Moon, named stars and their constellations, the aurora forecast, near-Earth asteroids and the next rocket launch. Tilt up from the globe and the same sky resolves into a look-around planetarium centred on your zenith.

Built for **AstralWeb Innovate · Aaruush '26**.

---

## The idea

Most space dashboards are spreadsheets with a starfield behind them. Zenith inverts that: the *sky* is the interface and the data is the light in it. The whole experience turns on one piece of visual tension — a cold, blue-black void pierced by a single warm element, **the Zenith Beam**: a volumetric ember lance rising from your exact coordinates into orbit. Warm-against-cold is the entire identity; everything telemetry-related stays instrument-cool (cyan, aurora-green, slate) so the ember always reads as *you, here, now*.

Three acts:

1. **Act I — Establishing uplink.** A cinematic loader: a restrained serif `Zenith` wordmark over concentric rings, a live `NN / 100` counter wired to real asset + first-data readiness, then a choreographed wipe-and-push into the scene.
2. **Act II — The radar.** A photoreal, orbitable Earth (custom day/night shader, city lights on the dark side, cloud veil, atmospheric rim, ocean sun-glint) wrapped in a live shell of satellites. A bottom time-scrubber lets you run the sky forward and back; "Tilt to Zenith" lifts you to the surface and opens the local sky dome with real stars at true alt/az.
3. **Act III — The Archive.** A Phantom-style curved wall of cards, one per live feed, that you orbit by scrolling (Lenis-smoothed). Click any card for the full story.

### Signature features

- **The Zenith Beam** — your location rendered as a warm volumetric column from ground to orbit, with a pulsing base ring. The memorable mark of the whole piece.
- **Globe → Sky-dome tilt** — one continuous gesture from "satellites over the planet" to "stars over my head", with the camera physically tilting toward the zenith.
- **Pick any location three ways** — search any city (offline list of 71 cities + live Open-Meteo geocoding), tap **Use my location** for GPS, or **click anywhere on the globe** to drop a pin; the chosen point is reverse-geocoded to a real city/country name.
- **Live overhead radar** — satellites and the ISS are propagated with SGP4 and shown both as an orbital shell around the globe and projected onto your local sky at their true altitude/azimuth. They're drawn as **modern icons** (a little solar-panelled satellite glyph; a larger, distinct ISS station marker), not dots — with hover scaling, a pulsing ISS, and a click-through info panel (direction, elevation, range, velocity).
- **The Archive — a spherical gallery** — a Three.js room you stand *inside*: live telemetry cards (APOD, ISS, crew, launches, near-Earth objects, space weather) plus fun daily cards (moon phase, space fact, this-day-in-space) wrap around the inside of a sphere. Drag to look around with real inertia, pan with the arrow keys, and click any card for a premium expand transition.
- **Time Machine** — scrub ±12 h minute-by-minute, or jump in ±100-year steps; star positions recompute from the date, so you can watch precession drift the sky over centuries.
- **Sky Postcard** — export the current frame as a labelled PNG (location + UTC timestamp) straight from the HUD.
- **Share Sky** — copy a link that encodes lat/lon/time; opening it drops the recipient into the exact same sky.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 14** (App Router) + TypeScript |
| 3D | **Three.js** + `@react-three/fiber` + `@react-three/drei` |
| Motion | **GSAP** (loader + camera transitions), **Lenis** (Archive scroll) |
| State | **Zustand** |
| Astronomy | **astronomy-engine** (Sun/Moon/planet alt-az, sub-solar terminator), **satellite.js** (SGP4 propagation) |
| Styling | **Tailwind CSS** with a hand-tuned cosmic token set |
| Hosting | **Vercel** (zero-config; API routes become serverless functions) |

Type spine: **Fraunces** (display serif), **IBM Plex Mono** (telemetry/HUD), **Inter** (body). All self-hosted via `next/font/local` — no external font fetch at runtime.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — add a NASA key if you have one
npm run dev                  # http://localhost:3000
```

Production:

```bash
npm run build && npm run start
```

> The app runs with **no configuration and no API keys**. See `IMPLEMENTATION_GUIDE.md` for the full empty-machine → live-URL walkthrough and Vercel deploy.

---

## API keys — what you actually need

**Short answer: two keys, both optional.**

| Service | Used by | Key? |
| --- | --- | --- |
| **NASA** (APOD, Near-Earth Objects, DONKI space weather) | `/api/apod`, `/api/neo`, `/api/donki` | **Recommended.** Free instant key at [api.nasa.gov](https://api.nasa.gov). Without it the app uses NASA's shared `DEMO_KEY`, which is **rate-limited and gets exhausted** under traffic. |
| **Groq** (Ask AI + AI insights on archive detail pages) | `/api/ask` | **Optional.** Free key at [console.groq.com/keys](https://console.groq.com/keys). Without it, AI features show a friendly "add your key" message; everything else works. |
| CelesTrak / satellite.js, wheretheiss.at, Open Notify, NOAA SWPC, Launch Library 2, Open-Meteo, BigDataCloud | satellites, ISS, crew, aurora, launches, city search, reverse-geocode | **No key.** All free and keyless. |

To add your keys, open the pre-made **`.env.local`** in the project root and paste them after each `=`:

```
NASA_API_KEY=your_nasa_key_here
GROQ_API_KEY=your_groq_key_here
```

That's it — restart the dev server. (`.env.example` documents every route and is the template to copy if `.env.local` is ever missing.) No other API on the reference list requires a key for the features currently built. If you later want higher launch-feed limits, a `LL2_TOKEN` slot is noted in `.env.example`.

---

## How the data layer works (and why it never white-screens)

Every external feed is proxied through an internal route under `src/app/api/*`. Each route does the same thing: **try the live source with a hard timeout, and on any failure return a bundled, realistic fallback tagged `fallback: true`.** The UI surfaces that tag as a small `CACHED` marker so it's always honest about what's live vs. offline, but the scene renders identically either way.

| Route | Live source | Key? |
| --- | --- | --- |
| `/api/iss` | wheretheiss.at | no |
| `/api/crew` | Open Notify | no |
| `/api/satellites` | CelesTrak (GP / TLE) | no |
| `/api/apod` | NASA APOD | optional |
| `/api/neo` | NASA NeoWs | optional |
| `/api/donki` | NASA DONKI | optional |
| `/api/aurora` | NOAA SWPC (planetary Kp) | no |
| `/api/launches` | Launch Library 2 | no |
| `/api/geocode` | BigDataCloud | no |

Satellite positions are computed **client-side** from TLEs with satellite.js (SGP4 → ECI → geodetic), so the globe stays smooth without hammering the network.

---

## Project structure

```
src/
  app/
    layout.tsx            # fonts, metadata, grain overlay
    page.tsx              # → SceneRoot (radar)
    archive/page.tsx      # Act III curved card wall
    api/*/route.ts        # 9 proxy routes, each with graceful fallback
    globals.css           # cosmic base + HUD primitives + range styling
  components/
    Loader.tsx            # Act I cinematic loader
    Hud.tsx               # 2D telemetry overlay + controls
    SceneRoot.tsx         # composes acts, runs bootstrap, reads share-link
    scene/
      Experience.tsx      # the R3F Canvas (client-only)
      Earth.tsx           # day/night shader, clouds, atmosphere, beam, sats
      SkyDome.tsx         # local-horizon stars, constellations, planets
      Starfield.tsx       # deep-space backdrop
      CameraRig.tsx       # OrbitControls + GSAP phase transitions
  lib/
    store.ts              # Zustand: phase, time, location, layers, data slots
    astronomy.ts          # astronomy-engine wrappers
    satellites.ts         # SGP4 propagation + ground tracks
    scene.ts              # coordinate conversions + scene constants
    proxy.ts              # server-side timed fetch + JSON helper
    useBootstrap.ts       # clock, geolocation, parallel fetch, progress
  data/
    stars.ts              # ~72 real bright stars across 18 constellations
    fallbacks.ts          # SGP4-validated TLEs + bundled offline data
  fonts/                  # self-hosted Fraunces / Inter / IBM Plex Mono
public/textures/earth/    # 2K day/night/clouds/specular maps (ship-ready)
```

---

## Upgrades (optional, documented for the judges)

**Sharper Earth.** The globe ships photoreal at 2K out of the box. To go higher, drop NASA Blue/Black Marble 8K textures into `public/textures/earth/` using the same filenames (`earth_atmos_2048.jpg`, `earth_lights_2048.png`, …) — the loader picks them up with no code change. Sources: NASA Visible Earth (Blue Marble Next Generation, Black Marble).

**Full star catalogue.** Stars are a curated real-coordinate set for instant load. For full fidelity, drop the HYG database (`hygdata_v3.csv`) into `public/data/` and swap the catalogue import in `src/components/scene/SkyDome.tsx` for a CSV loader — the alt/az math is already general.

---

## Credits

- **Earth & Moon textures** — derived from NASA Visible Earth, via the three.js examples asset set.
- **Fonts** — Fraunces, Inter, IBM Plex Mono (Google Fonts / SIL Open Font License).
- **Star data** — coordinates approximate the HYG database (D. Nash).
- **Live data** — NASA, NOAA SWPC, CelesTrak, wheretheiss.at, Open Notify, The Space Devs (Launch Library 2), BigDataCloud.

Astronomical positions use astronomy-engine and satellite.js; they are accurate enough for a real-time visualisation but Zenith is an experience, not a navigation instrument.

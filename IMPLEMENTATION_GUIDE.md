# Implementation Guide — Zenith

Everything needed to take this from a fresh machine to a live URL. The app is intentionally **zero-config**: it builds and runs with no API keys and no environment file. The optional steps below only make it *sharper* or *less rate-limited*.

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| **Node.js** | **18.18+ or 20+** (built/tested on Node 22) | `node -v` to check. Get it from nodejs.org or via `nvm`. |
| **npm** | 9+ (ships with the Node versions above) | Yarn/pnpm work too; lockfile is npm. |
| A modern browser | — | WebGL2 required (every current browser has it). |

That's the whole list. No database, no native build tools, no Python.

---

## 2. Install & run locally

```bash
# from the project root
npm install          # ~1–2 min the first time
npm run dev          # starts on http://localhost:3000
```

Open http://localhost:3000. You should see the loader fill to 100, then push into the globe.

> **Geolocation:** the browser will ask permission to use your location so the sky is *your* sky. Decline and it falls back gracefully to a default city — nothing breaks.

To run the optimised production build the way Vercel will:

```bash
npm run build        # type-checks + builds; must finish clean
npm run start        # serves the production build on :3000
```

---

## 3. Optional — add a NASA key (removes a rate limit)

APOD, near-Earth objects and space-weather pull from NASA's open API. Out of the box they use the shared `DEMO_KEY`, which is capped at ~30 requests/hour/IP — fine for a demo, occasionally throttled under a crowd.

1. Get a free, instant key at **https://api.nasa.gov** (just an email).
2. Create `.env.local` in the project root:
   ```bash
   cp .env.example .env.local
   ```
3. Set the value:
   ```
   NASA_API_KEY=your_key_here
   ```
4. Restart `npm run dev`.

No other service needs a key.

---

## 4. Optional — drop in NASA 8K Earth textures

The globe ships photoreal at 2K. To push it to 8K with no code change, replace the files in `public/textures/earth/` **keeping the exact same filenames**:

| Filename | What it is | Where to get it |
| --- | --- | --- |
| `earth_atmos_2048.jpg` | daytime colour (Blue Marble) | NASA Visible Earth — *Blue Marble Next Generation* |
| `earth_lights_2048.png` | night city lights (Black Marble) | NASA Visible Earth — *Black Marble* |
| `earth_clouds_1024.png` | cloud layer (transparent PNG) | NASA Visible Earth cloud composite |
| `earth_specular_2048.jpg` | ocean mask for sun-glint | NASA Visible Earth water-mask |

The loader reads by filename, so an 8K JPG named `earth_atmos_2048.jpg` simply renders sharper. (Keep an eye on total size — 8K maps are tens of MB each and will slow first paint.)

To go full-fidelity on stars, drop the HYG catalogue (`hygdata_v3.csv`) into `public/data/` and swap the import in `src/components/scene/SkyDome.tsx` — see the note in `README.md`.

---

## 5. Deploy to Vercel

Zenith is a stock Next.js 14 App Router app, so Vercel needs zero custom settings. The API routes automatically become serverless functions.

### Option A — GitHub one-click (recommended)

1. Push this folder to a new GitHub repository.
2. Go to **vercel.com → Add New → Project**, and import that repo.
3. Framework preset auto-detects as **Next.js**. Leave build/output settings at their defaults.
4. *(Optional)* under **Environment Variables**, add `NASA_API_KEY`.
5. Click **Deploy**. ~90 seconds later you have a live `*.vercel.app` URL.

Every future `git push` to the main branch redeploys automatically.

### Option B — Vercel CLI

```bash
npm i -g vercel      # one-time
vercel login
vercel               # from the project root → creates a preview deployment
vercel --prod        # promote to production
```

If you added a NASA key:

```bash
vercel env add NASA_API_KEY
```

---

## 6. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `npm run build` fails on types | You're on an old Node. Use 18.18+ / 20+ and reinstall. |
| Globe is black, HUD shows but no Earth | WebGL blocked (headless browser, GPU disabled, or a hardware-accel-off setting). Enable hardware acceleration. |
| Data cards all show `CACHED` | The live APIs are unreachable from your network (firewall/offline), so fallbacks are serving. Expected behaviour — the scene is identical; values just aren't live. |
| NASA cards occasionally empty/slow | `DEMO_KEY` rate limit. Add your own `NASA_API_KEY` (step 3). |
| Location is wrong / a default city | Geolocation was denied or unavailable. Allow location, or share a `?lat=&lon=` link. |
| Archive cards don't move | Scroll inside the page — the wall rotates with scroll. On a trackpad, swipe vertically. |

---

## 7. What runs where

- **Client (browser):** the entire 3D scene, SGP4 satellite propagation, all astronomy math, GSAP/Lenis motion. The Canvas is loaded client-only (`ssr: false`) so there's no server-side WebGL.
- **Server (Vercel functions):** only the thin `/api/*` proxies that fetch third-party data and attach a `fallback` flag. Nothing heavy, nothing stateful.

That separation is why it deploys clean and cold-starts fast.

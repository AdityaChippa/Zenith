'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useZenith, type LayerState, type SatGroup, SAT_GROUPS } from '@/lib/store';
import { compass, moonIllumination, computeBodies } from '@/lib/astronomy';
import { lookAnglesAll } from '@/lib/satellites';
import { FALLBACK_TLES } from '@/data/fallbacks';
import { exportSkyPostcard } from '@/lib/postcard';
import { startAmbient, stopAmbient } from '@/lib/ambient';
import { CITIES, type City } from '@/data/cities';

function fmtClock(d: Date, utc = false) {
  const h = utc ? d.getUTCHours() : d.getHours();
  const m = utc ? d.getUTCMinutes() : d.getMinutes();
  const s = utc ? d.getUTCSeconds() : d.getSeconds();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const SAT_GROUP_LABEL: Record<SatGroup, string> = { station: 'STATION', comms: 'COMMS', navigation: 'GPS', weather: 'WEATHER', science: 'SCIENCE', earth: 'EARTH' };
const DOME_LAYERS: { key: keyof LayerState; label: string }[] = [
  { key: 'stars', label: 'STARS' }, { key: 'constellations', label: 'CONSTELLATIONS' }, { key: 'ecliptic', label: 'ECLIPTIC' },
  { key: 'planets', label: 'PLANETS' }, { key: 'satellites', label: 'SATELLITES' }, { key: 'graticule', label: 'ALT-AZ GRID' }, { key: 'starLabels', label: 'LABELS' },
];
const GLOBE_LAYERS: { key: keyof LayerState; label: string }[] = [
  { key: 'satellites', label: 'SATELLITES' }, { key: 'iss', label: 'ISS + TRACK' }, { key: 'clouds', label: 'CLOUD VEIL' },
  { key: 'constellations', label: 'CONSTELLATIONS' }, { key: 'starLabels', label: 'STAR LABELS' }, { key: 'aurora', label: 'AURORA' }, { key: 'launches', label: 'LAUNCHES' },
];

/** Next time a named satellite rises above ~10° for the observer (minutes from `from`). */
function nextPass(name: string, lat: number, lon: number, from: Date): number | null {
  for (let m = 1; m <= 360; m += 1) {
    const d = new Date(from.getTime() + m * 60_000);
    const hit = lookAnglesAll(FALLBACK_TLES, d, lat, lon).find((s) => s.name === name && s.alt > 10);
    if (hit) return m;
  }
  return null;
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex w-full items-center justify-between py-1.5 text-left">
      <span className={`font-mono text-[10px] tracking-widest transition-colors ${on ? 'text-starlight' : 'text-slate/55'}`}>{label}</span>
      <span className={`ml-3 h-3.5 w-6 shrink-0 rounded-full border transition-all duration-300 ${on ? 'border-ember/70 bg-ember/20' : 'border-slate/40'}`}>
        <span className={`block h-2.5 w-2.5 rounded-full transition-all duration-300 ${on ? 'ml-[11px] bg-ember shadow-[0_0_8px_#FF8A3D]' : 'ml-[1px] bg-slate/60'} mt-[1.5px]`} />
      </span>
    </button>
  );
}

function Pill({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-widest transition-all ${on ? 'border-ember/60 bg-ember/15 text-ember' : 'border-white/12 text-slate/70 hover:text-starlight'}`}>{label}</button>
  );
}

function ApodImg({ url, title }: { url: string; title: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <div className="mb-2 h-24 w-full rounded-xl" style={{ background: 'linear-gradient(135deg,#3DD8E033,#16181D)' }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={title} onError={() => setOk(false)} className="mb-2 h-24 w-full rounded-xl object-cover" />;
}

function Card({ title, accent, loading, children }: { title: string; accent?: string; loading?: boolean; children: React.ReactNode }) {
  return (
    <div className="glass glass-hover rounded-2xl p-3.5">
      <div className="mb-2 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: accent || '#76767C', boxShadow: `0 0 8px ${accent || '#76767C'}` }} /><span className="hud-label">{title}</span></div>
      {loading ? <div className="space-y-2"><div className="skeleton h-3 w-3/4" /><div className="skeleton h-3 w-1/2" /></div> : children}
    </div>
  );
}

function LocationSearch({ onClose }: { onClose: () => void }) {
  const setLocation = useZenith((s) => s.setLocation);
  const [q, setQ] = useState(''); const [results, setResults] = useState<City[]>([]); const [busy, setBusy] = useState(false);
  const deb = useRef<number | null>(null); const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const s = q.trim().toLowerCase(); if (s.length < 2) { setResults([]); return; }
    const local = CITIES.filter((c) => c.name.toLowerCase().includes(s)).slice(0, 6); setResults(local);
    if (deb.current) clearTimeout(deb.current);
    deb.current = window.setTimeout(async () => {
      try { const r = await fetch(`/api/geocode?q=${encodeURIComponent(s)}`); const j = (await r.json()) as { data?: { results?: City[] } }; const live = j?.data?.results || [];
        if (live.length) { const merged = [...local]; for (const x of live) if (!merged.some((m) => m.name.toLowerCase() === x.name.toLowerCase())) merged.push(x); setResults(merged.slice(0, 8)); }
      } catch { /* keep local */ }
    }, 280) as unknown as number;
  }, [q]);
  const choose = (c: City) => { setLocation({ lat: c.lat, lon: c.lon, label: `${c.name}${c.country ? ', ' + c.country : ''}` }); onClose(); };
  const gps = () => {
    if (!navigator.geolocation) return; setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords; setLocation({ lat, lon, label: 'Locating…' });
      try { const r = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`); const j = (await r.json()) as { data?: { label?: string } }; setLocation({ lat, lon, label: j?.data?.label || `${lat.toFixed(2)}, ${lon.toFixed(2)}` }); }
      catch { setLocation({ lat, lon, label: `${lat.toFixed(2)}, ${lon.toFixed(2)}` }); }
      setBusy(false); onClose();
    }, () => setBusy(false), { timeout: 8000 });
  };
  return (
    <div className="glass mt-3 w-[min(340px,80vw)] rounded-2xl p-3" style={{ animation: 'fadeUp 0.3s ease' }}>
      <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city…" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-starlight outline-none placeholder:text-slate/60 focus:border-ember/50" />
      {results.length > 0 && (
        <ul className="mt-2 max-h-56 overflow-auto">
          {results.map((c, i) => (
            <li key={`${c.name}-${i}`}><button onClick={() => choose(c)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-starlight transition-colors hover:bg-white/[0.07]"><span>{c.name}{c.country ? <span className="text-slate"> · {c.country}</span> : null}</span><span className="font-mono text-[10px] text-slate">{c.lat.toFixed(1)}, {c.lon.toFixed(1)}</span></button></li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button onClick={gps} disabled={busy} className="flex-1 rounded-xl bg-gradient-to-r from-ember to-ember-deep px-3 py-2 font-mono text-[11px] tracking-widest text-void transition-transform hover:scale-[1.02] disabled:opacity-60">{busy ? 'LOCATING…' : '◎ USE MY LOCATION'}</button>
        <span className="font-mono text-[9px] tracking-wider text-slate">or click the globe</span>
      </div>
    </div>
  );
}

export default function Hud() {
  const s = useZenith();
  const router = useRouter();
  const [flash, setFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQ, setAiQ] = useState(''); const [aiText, setAiText] = useState(''); const [aiBusy, setAiBusy] = useState(false);
  const prevPhase = useRef(s.phase);
  const wipe = useRef<HTMLDivElement>(null);
  const date = s.effectiveDate();
  const dome = s.phase === 'dome';
  const naked = s.skyMode === 'naked';

  useEffect(() => {
    if (s.phase !== prevPhase.current) { prevPhase.current = s.phase; setFlash(true); const t = setTimeout(() => setFlash(false), 520); return () => clearTimeout(t); }
  }, [s.phase]);
  useEffect(() => { if (s.soundOn) startAmbient(); else stopAmbient(); }, [s.soundOn]);
  useEffect(() => () => stopAmbient(), []);

  const moon = Math.round(moonIllumination(date) * 100);

  // overhead within the zenith cone + telemetry count (dome only)
  const { overhead, satsUp } = useMemo(() => {
    if (!dome) return { overhead: [] as { name: string; az: number; alt: number }[], satsUp: 0 };
    const minAlt = 90 - s.zenithCone;
    const sats = lookAnglesAll(FALLBACK_TLES, date, s.location.lat, s.location.lon).filter((x) => s.satGroups[x.group] !== false);
    const bodies = s.layers.planets ? computeBodies(date, s.location.lat, s.location.lon).filter((b) => b.altitude > 0).map((b) => ({ name: b.name, az: b.azimuth, alt: b.altitude })) : [];
    const satItems = s.layers.satellites ? sats.map((x) => ({ name: x.name, az: x.az, alt: x.alt })) : [];
    const all = [...bodies, ...satItems].filter((o) => o.alt >= minAlt).sort((a, b) => b.alt - a.alt);
    return { overhead: all.slice(0, 7), satsUp: sats.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dome, s.now, s.scrubMinutes, s.yearOffset, s.location, s.zenithCone, s.satGroups, s.layers.planets, s.layers.satellites]);

  if (s.phase === 'loading') return null;

  const crew = s.crew.data, apod = s.apod.data, aurora = s.aurora.data, launches = s.launches.data, neo = s.neo.data, donki = s.donki.data;

  function savePostcard() { exportSkyPostcard(date, s.location.lat, s.location.lon, s.location.label); }
  async function copyLink() {
    const u = new URL(window.location.href);
    u.searchParams.set('lat', s.location.lat.toFixed(4)); u.searchParams.set('lon', s.location.lon.toFixed(4)); u.searchParams.set('t', String(s.now + s.scrubMinutes * 60000));
    try { await navigator.clipboard.writeText(u.toString()); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* */ }
  }
  function goArchive() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !wipe.current) { router.push('/archive'); return; }
    wipe.current.style.display = 'block';
    wipe.current.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0%)' }], { duration: 480, easing: 'cubic-bezier(0.7,0,0.3,1)', fill: 'forwards' });
    setTimeout(() => router.push('/archive'), 440);
  }
  async function askAI() {
    if (!aiQ.trim()) return; setAiBusy(true); setAiText('');
    try { const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `${aiQ.trim()} (Observer near ${s.location.label}.)` }) }); const j = await r.json(); setAiText(j?.data?.text || 'No response.'); }
    catch { setAiText('The AI service is unavailable right now.'); }
    setAiBusy(false);
  }
  function gotoNextPass() {
    const name = s.selected?.name || 'ISS (ZARYA)';
    const m = nextPass(name, s.location.lat, s.location.lon, date);
    if (m != null) { s.setLive(false); s.setPlaySpeed(0); s.setScrubMinutes(Math.max(-1440, Math.min(1440, s.scrubMinutes + m))); }
  }

  const SPEEDS: { label: string; v: number }[] = [{ label: '1×', v: 1 / 60 }, { label: '1M/S', v: 1 }, { label: '1H/S', v: 60 }, { label: '1D/S', v: 1440 }];

  return (
    <div className="pointer-events-none fixed inset-0 z-40 select-none">
      <div className={`absolute inset-0 bg-ember transition-opacity duration-500 ${flash ? 'opacity-[0.1]' : 'opacity-0'}`} />

      {/* ===================== TOP-LEFT ===================== */}
      {dome ? (
        <div className="pointer-events-auto absolute left-5 top-5 z-30 flex items-start gap-3">
          <button onClick={() => s.setPhase('globe')} className="glass rounded-2xl px-4 py-3 font-mono text-[12px] tracking-widest text-starlight transition-colors hover:text-ember">← GLOBE</button>
          <div className="glass rounded-2xl px-4 py-2.5">
            <div className="hud-label">OBSERVING FROM</div>
            <div className="font-display text-lg text-starlight" style={{ fontWeight: 460 }}>{s.location.label}</div>
            <div className="hud-label mt-0.5">{s.location.lat.toFixed(3)}, {s.location.lon.toFixed(3)}</div>
          </div>
          <div className="glass rounded-2xl px-4 py-2.5">
            <div className="hud-label">TELEMETRY</div>
            <div className="mt-1 flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${s.live ? 'bg-aurora' : 'bg-ember'} animate-pulse-soft`} /><span className="font-mono text-xs tracking-widest text-starlight">{s.live ? 'LIVE' : 'SIM'} · {satsUp} sats</span></div>
          </div>
        </div>
      ) : (
        <div className="pointer-events-auto absolute left-5 top-5 z-30 max-w-[60vw]">
          <div className="flex items-baseline gap-2"><span className="font-display text-2xl tracking-wide text-starlight" style={{ fontWeight: 400 }}>Zenith</span><span className="hud-label hidden sm:inline">/ celestial eye</span></div>
          <button onClick={() => setSearchOpen((v) => !v)} className="group mt-2 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 backdrop-blur-md transition-colors hover:border-ember/40">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-ember" /><span className="hud-value text-sm">{s.location.label}</span><span className="font-mono text-[10px] text-slate transition-colors group-hover:text-ember">CHANGE ▾</span>
          </button>
          <div className="hud-label mt-1.5 pl-1">{s.location.lat.toFixed(3)}°, {s.location.lon.toFixed(3)}° · moon {moon}%</div>
          {searchOpen && <LocationSearch onClose={() => setSearchOpen(false)} />}
        </div>
      )}

      {/* ===================== TOP-RIGHT ===================== */}
      {dome ? (
        <div className="absolute right-5 top-5 z-30 flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex gap-2">
            <button onClick={savePostcard} className="glass glass-hover rounded-full px-3.5 py-2 font-mono text-[10px] tracking-widest text-starlight">SKY POSTCARD</button>
            <button onClick={copyLink} className="glass glass-hover rounded-full px-3.5 py-2 font-mono text-[10px] tracking-widest text-starlight">{copied ? 'COPIED ✓' : 'SHARE'}</button>
            <button onClick={() => s.toggleSound()} className="glass glass-hover rounded-full px-3.5 py-2 font-mono text-[10px] tracking-widest text-starlight">{s.soundOn ? '♪ SOUND' : 'SOUND'}</button>
          </div>
          {s.selected && (
            <div className="pointer-events-auto mt-1 w-72 glass rounded-2xl p-4" style={{ animation: 'fadeUp 0.3s ease' }}>
              <div className="mb-1 flex items-center justify-between"><span className="hud-label">{s.selected.kind}</span><button onClick={() => s.select(null)} className="font-mono text-[11px] text-slate hover:text-starlight">✕</button></div>
              <div className="mb-3 font-display text-2xl text-starlight" style={{ fontWeight: 460 }}>{s.selected.name}</div>
              <div className="space-y-1.5">
                {s.selected.lines.map((l) => (<div key={l.label} className="flex items-center justify-between"><span className="hud-label">{l.label}</span><span className="hud-value text-xs">{l.value}</span></div>))}
              </div>
              {(s.selected.kind === 'satellite' || s.selected.kind === 'iss') && (
                <button onClick={gotoNextPass} className="mt-3 w-full rounded-xl border border-white/12 py-2 font-mono text-[10px] tracking-widest text-starlight transition-colors hover:border-ember/50 hover:text-ember">NEXT VISIBLE PASS</button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="absolute right-5 top-5 z-20 flex flex-col items-end gap-2">
          <div className="glass rounded-2xl px-4 py-2.5 text-right"><div className="flex items-center gap-4"><div><div className="hud-label">UTC</div><div className="hud-value text-base">{fmtClock(date, true)}</div></div><div className="h-7 w-px bg-white/10" /><div><div className="hud-label">LOCAL</div><div className="hud-value text-base">{fmtClock(date)}</div></div></div></div>
          <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5"><span className="h-1.5 w-1.5 rounded-full bg-aurora shadow-[0_0_8px_#4DF0A8]" /><span className="font-mono text-[10px] tracking-widest text-starlight">{crew ? crew.number : '—'} IN ORBIT</span></div>
        </div>
      )}

      {/* ===================== LEFT RAIL ===================== */}
      {dome ? (naked ? null : (
        <div className="pointer-events-auto absolute left-5 top-32 z-20 w-52 space-y-2.5 hidden md:block">
          <div className="glass rounded-2xl p-3.5">
            <div className="mb-2 flex items-center justify-between"><span className="hud-label">Directly overhead</span><span className="font-mono text-xs text-ember">{overhead.length}</span></div>
            {overhead.length ? overhead.map((o) => (<div key={o.name} className="flex items-center justify-between py-1"><span className="font-mono text-[10px] text-starlight">{o.name}</span><span className="font-mono text-[10px] text-slate">{compass(o.az)} {o.alt.toFixed(0)}°</span></div>)) : <div className="hud-label">nothing within the cone</div>}
          </div>
          <div className="glass rounded-2xl p-3.5">
            <div className="hud-label mb-2">Layers</div>
            {DOME_LAYERS.map((l) => <Toggle key={l.key} label={l.label} on={s.layers[l.key]} onClick={() => s.toggleLayer(l.key)} />)}
          </div>
          <div className="glass rounded-2xl p-3.5">
            <div className="hud-label mb-2">Satellite groups</div>
            <div className="flex flex-wrap gap-1.5">{SAT_GROUPS.map((g) => <Pill key={g} label={SAT_GROUP_LABEL[g]} on={s.satGroups[g]} onClick={() => s.toggleSatGroup(g)} />)}</div>
          </div>
          <div className="glass rounded-2xl p-3.5">
            <div className="mb-2 flex items-center justify-between"><span className="hud-label">Zenith cone</span><span className="font-mono text-xs text-ember">±{s.zenithCone}°</span></div>
            <input type="range" min={5} max={90} value={s.zenithCone} onChange={(e) => s.setZenithCone(Number(e.target.value))} className="zenith-range w-full" aria-label="Zenith cone" />
          </div>
        </div>
      )) : (
        <div className="pointer-events-auto absolute left-5 top-1/2 z-20 w-48 -translate-y-1/2 hidden md:block">
          <div className="glass rounded-2xl p-3.5"><div className="hud-label mb-2">Layers</div>{GLOBE_LAYERS.map((l) => <Toggle key={l.key} label={l.label} on={s.layers[l.key]} onClick={() => s.toggleLayer(l.key)} />)}</div>
        </div>
      )}

      {/* ===================== RIGHT RAIL (globe only) ===================== */}
      {!dome && (
        <div className="pointer-events-auto absolute right-5 top-1/2 z-20 w-64 -translate-y-1/2 hidden flex-col gap-2.5 lg:flex">
          <Card title={`APOD${s.apod.fallback ? ' · cached' : ''}`} accent="#3DD8E0" loading={s.apod.loading && !apod}>
            {apod ? (<div>{apod.media_type === 'image' && <ApodImg url={apod.url} title={apod.title} />}<div className="font-body text-xs text-starlight">{apod.title}</div></div>) : <div className="hud-label">no signal</div>}
          </Card>
          <Card title="SPACE WEATHER" accent="#4DF0A8" loading={s.aurora.loading && !aurora}>
            <div className="flex items-end justify-between"><div><div className="hud-label">Kp INDEX</div><div className="font-mono text-2xl tabular-nums text-starlight">{aurora ? aurora.kp.toFixed(0) : '—'}</div></div><div className="text-right"><div className="hud-label">AURORA</div><div className="font-mono text-sm text-aurora">{aurora ? `${aurora.chance}%` : '—'}</div></div></div>
            {donki && donki[0] && (<div className="mt-2 border-t border-white/8 pt-2"><div className="hud-label">LATEST EVENT</div><div className="font-mono text-[10px] text-starlight">{donki[0].type}{donki[0].class ? ` · ${donki[0].class}` : ''}</div></div>)}
          </Card>
          <Card title="NEXT LAUNCH" accent="#FF8A3D" loading={s.launches.loading && !launches}>{launches && launches[0] ? (<div><div className="font-body text-xs text-starlight">{launches[0].name}</div><div className="hud-label mt-1">{new Date(launches[0].net).toUTCString().slice(5, 22)} UTC</div></div>) : <div className="hud-label">standby</div>}</Card>
          <Card title="NEAR-EARTH OBJECTS" accent="#FF5C7A" loading={s.neo.loading && !neo}>
            {neo && neo.length ? (<div className="space-y-1">{neo.slice(0, 3).map((n) => (<div key={n.name} className="flex items-center justify-between"><span className="font-mono text-[10px] text-starlight">{n.name}</span><span className={`font-mono text-[10px] ${n.hazardous ? 'text-hazard' : 'text-slate'}`}>{(n.miss / 1000).toFixed(0)}k km</span></div>))}</div>) : <div className="hud-label">clear</div>}
          </Card>
        </div>
      )}

      {/* ===================== BOTTOM ===================== */}
      {dome ? (
        <div className="pointer-events-auto absolute bottom-5 left-1/2 z-20 w-[min(940px,94vw)] -translate-x-1/2">
          <div className="glass rounded-3xl px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><div className="font-mono text-xl tabular-nums text-starlight">{fmtClock(date, true)} <span className="text-sm text-slate">UTC</span></div><div className="hud-label mt-0.5">{date.toUTCString().slice(5, 16)} · {fmtClock(date)} local</div></div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => s.setLive(true)} className={`rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-widest transition-all ${s.live ? 'border-aurora/60 bg-aurora/15 text-aurora' : 'border-white/12 text-slate hover:text-starlight'}`}>● LIVE</button>
                <button onClick={() => s.setPlaySpeed(0)} className={`rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-widest transition-all ${!s.live && s.playSpeed === 0 ? 'border-ember/60 bg-ember/15 text-ember' : 'border-white/12 text-slate hover:text-starlight'}`}>❚❚</button>
                {SPEEDS.map((sp) => (<button key={sp.label} onClick={() => s.setPlaySpeed(sp.v)} className={`rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-widest transition-all ${s.playSpeed === sp.v ? 'border-ember/60 bg-ember/15 text-ember' : 'border-white/12 text-slate hover:text-starlight'}`}>{sp.label}</button>))}
                <button onClick={gotoNextPass} className="rounded-full border border-ember/40 px-3 py-1.5 font-mono text-[10px] tracking-widest text-ember transition-colors hover:bg-ember/10">↝ NEXT ISS PASS</button>
              </div>
            </div>
            <div className="flex items-center gap-3"><span className="hud-label">−24H</span><input type="range" min={-1440} max={1440} value={s.scrubMinutes} onChange={(e) => { s.setLive(false); s.setPlaySpeed(0); s.setScrubMinutes(Number(e.target.value)); }} className="zenith-range w-full" aria-label="Time machine" /><span className="hud-label">+24H</span></div>
            <div className="mt-1.5 text-right"><button onClick={() => s.resetTime()} className="font-mono text-[10px] tracking-widest text-slate hover:text-ember">{s.live ? 'PRESENT' : 'RESET → PRESENT'}</button></div>
          </div>
        </div>
      ) : (
        <div className="pointer-events-auto absolute bottom-5 left-1/2 z-20 w-fit max-w-[94vw] -translate-x-1/2">
          <div className="glass rounded-2xl px-5 py-3">
            <div className="mb-2 flex items-center justify-between gap-6">
              <span className="hud-label">Time · {s.scrubMinutes === 0 && s.yearOffset === 0 ? 'LIVE' : 'SCRUBBED'}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => s.setYearOffset(s.yearOffset - 100)} className="font-mono text-[10px] tracking-widest text-slate transition-colors hover:text-starlight">−100Y</button>
                <span className="font-mono text-[10px] tabular-nums text-ember">{s.yearOffset === 0 ? 'NOW' : `${s.yearOffset > 0 ? '+' : ''}${s.yearOffset}Y`}</span>
                <button onClick={() => s.setYearOffset(s.yearOffset + 100)} className="font-mono text-[10px] tracking-widest text-slate transition-colors hover:text-starlight">+100Y</button>
                <button onClick={() => s.resetTime()} className="font-mono text-[10px] tracking-widest text-slate transition-colors hover:text-ember">RESET</button>
              </div>
            </div>
            <input type="range" min={-720} max={720} value={s.scrubMinutes} onChange={(e) => { s.setLive(false); s.setScrubMinutes(Number(e.target.value)); }} className="zenith-range w-full" aria-label="Scrub time" />
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <button onClick={() => { s.setSkyMode('naked'); s.setPhase('dome'); }} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-ember to-ember-deep px-4 py-1.5 font-mono text-[11px] font-medium tracking-widest text-void transition-transform hover:scale-[1.03] active:scale-95">↑ TILT TO ZENITH</button>
              <button onClick={() => s.toggleSound()} className="rounded-full border border-white/12 px-3 py-1.5 font-mono text-[11px] tracking-widest text-slate transition-colors hover:text-starlight">{s.soundOn ? '♪ SOUND ON' : 'SOUND OFF'}</button>
              <button onClick={savePostcard} className="rounded-full border border-white/12 px-3 py-1.5 font-mono text-[11px] tracking-widest text-slate transition-colors hover:text-cyan">GLOBE POSTCARD</button>
              <button onClick={copyLink} className="rounded-full border border-white/12 px-3 py-1.5 font-mono text-[11px] tracking-widest text-slate transition-colors hover:text-cyan">{copied ? 'COPIED ✓' : 'SHARE'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Ask AI (bottom-left, straight) + Archive (bottom-right) — globe only */}
      {!dome && (
        <>
          <button onClick={() => setAiOpen(true)} className="group pointer-events-auto absolute bottom-7 left-6 z-20 hidden text-left md:block">
            <span className="block font-display text-3xl leading-none text-starlight transition-colors group-hover:text-ember" style={{ fontWeight: 500 }}>Ask&nbsp;AI <span className="text-ember">↗</span></span>
            <span className="mt-1 block font-mono text-[9px] tracking-widest text-slate">your sky, explained</span>
          </button>
          <button onClick={goArchive} className="group pointer-events-auto absolute bottom-7 right-6 z-20 hidden text-right md:block">
            <span className="block font-display text-3xl leading-none text-starlight transition-colors group-hover:text-ember" style={{ fontWeight: 500 }}>Archive <span className="text-ember">→</span></span>
            <span className="mt-1 block font-mono text-[9px] tracking-widest text-slate">live telemetry gallery</span>
          </button>
        </>
      )}

      {/* SELECTION DETAIL — globe only (dome shows it top-right) */}
      {!dome && s.selected && (
        <div className="pointer-events-auto absolute bottom-28 left-5 z-20 w-64" style={{ animation: 'fadeUp 0.3s ease' }}>
          <div className="glass rounded-2xl p-3.5">
            <div className="mb-2 flex items-center justify-between"><span className="font-mono text-xs tracking-widest text-ember">{s.selected.name}</span><button onClick={() => s.select(null)} className="font-mono text-[11px] text-slate hover:text-starlight">✕</button></div>
            <div className="hud-label mb-2">{s.selected.kind.toUpperCase()}</div>
            <div className="space-y-1">{s.selected.lines.map((l) => (<div key={l.label} className="flex items-center justify-between"><span className="hud-label">{l.label}</span><span className="hud-value text-xs">{l.value}</span></div>))}</div>
          </div>
        </div>
      )}

      {/* ASK AI modal */}
      {aiOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[55] flex items-center justify-center p-5 backdrop-blur-md" style={{ background: 'rgba(8,9,11,0.72)' }} onClick={() => setAiOpen(false)}>
          <div className="glass w-[min(560px,94vw)] rounded-3xl p-6" style={{ animation: 'zoomIn 0.4s cubic-bezier(0.16,1,0.3,1)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-ember">✦</span><span className="font-display text-2xl text-starlight" style={{ fontWeight: 500 }}>Ask the sky</span></div><button onClick={() => setAiOpen(false)} className="font-mono text-[11px] text-slate hover:text-starlight">✕</button></div>
            <p className="mb-4 font-body text-xs leading-relaxed text-slate">Best for the timeless stuff — how orbits work, why the Moon has phases, what a nebula is. It thinks in deep time, so today&rsquo;s headlines aren&rsquo;t its strong suit.</p>
            <div className="flex gap-2"><input value={aiQ} onChange={(e) => setAiQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && askAI()} placeholder="Why does the ISS orbit so fast?" autoFocus className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-starlight outline-none placeholder:text-slate/60 focus:border-ember/50" /><button onClick={askAI} disabled={aiBusy} className="rounded-xl bg-gradient-to-r from-ember to-ember-deep px-4 py-2.5 font-mono text-[11px] tracking-widest text-void transition-transform hover:scale-[1.03] disabled:opacity-60">{aiBusy ? '…' : 'ASK'}</button></div>
            {aiText && (<div className="mt-4 max-h-[40vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4" style={{ animation: 'fadeUp 0.4s ease' }}><p className="whitespace-pre-line font-body text-sm leading-relaxed text-starlight">{aiText}</p></div>)}
          </div>
        </div>
      )}

      <div ref={wipe} className="fixed inset-0 z-50 hidden" style={{ background: 'linear-gradient(180deg, #FF8A3D, #08090B)' }} />
    </div>
  );
}

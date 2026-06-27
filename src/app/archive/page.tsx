'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { moonIllumination } from '@/lib/astronomy';
import type { ArchiveItem } from '@/components/archive/ArchiveSphere';

const ArchiveSphere = dynamic(() => import('@/components/archive/ArchiveSphere'), { ssr: false, loading: () => null });

async function getJSON(url: string) { try { const r = await fetch(url); return (await r.json()) as { data?: unknown; fallback?: boolean }; } catch { return null; } }

// CORS-friendly, filename-based Wikimedia URLs (stable; fall back to art if blocked).
const wiki = (name: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${name}?width=1000`;
const IMG = {
  iss: wiki('International_Space_Station_after_undocking_of_STS-132.jpg'),
  moon: wiki('FullMoon2010.jpg'),
  crew: wiki('Expedition_56_crew_members.jpg'),
  earth: wiki('The_Earth_seen_from_Apollo_17.jpg'),
  mars: wiki('OSIRIS_Mars_true_color.jpg'),
  saturn: wiki('Saturn_during_Equinox.jpg'),
  andromeda: wiki('Andromeda_Galaxy_(with_h-alpha).jpg'),
  hubble: wiki('Hubble_ultra_deep_field_high_rez_edit1.jpg'),
  crab: wiki('Crab_Nebula.jpg'),
  sun: wiki('Sun_white.jpg'),
};

const FACTS = [
  'A day on Venus is longer than its year — it rotates once every 243 Earth days but orbits the Sun in 225.',
  'Neutron stars are so dense that a sugar-cube of their material would weigh about a billion tonnes.',
  'There are more stars in the observable universe than grains of sand on every beach on Earth.',
  'Light from the Sun takes about 8 minutes and 20 seconds to reach your eyes.',
  'Saturn is light enough to float in water — if you could find a bathtub big enough.',
];
const HISTORY = [
  { d: 'Apr 12, 1961', e: 'Yuri Gagarin becomes the first human in space aboard Vostok 1, completing a single orbit of Earth.' },
  { d: 'Jul 20, 1969', e: 'Apollo 11 lands the first humans on the Moon; Armstrong and Aldrin walk the surface.' },
  { d: 'Apr 24, 1990', e: 'The Hubble Space Telescope is deployed into low Earth orbit, transforming modern astronomy.' },
  { d: 'Nov 2, 2000', e: 'The first long-duration crew arrives at the ISS — continuously crewed ever since.' },
];

type QItem = { q: string; a: string[]; correct: number; why: string };
const QUIZZES: Record<string, QItem[]> = {
  space: [
    { q: 'Which planet has the most moons?', a: ['Jupiter', 'Saturn', 'Neptune', 'Mars'], correct: 1, why: 'Saturn leads with 140+ confirmed moons.' },
    { q: 'How long does sunlight take to reach Earth?', a: ['8 seconds', '8 minutes', '8 hours', '8 days'], correct: 1, why: 'About 8 minutes 20 seconds.' },
    { q: 'Closest star to the Sun?', a: ['Sirius', 'Betelgeuse', 'Proxima Centauri', 'Vega'], correct: 2, why: 'Proxima Centauri, ~4.24 light-years.' },
    { q: 'What causes the aurora?', a: ['Moonlight', 'Solar wind particles', 'City lights', 'Lightning'], correct: 1, why: 'Charged solar particles excite upper-atmosphere gases.' },
  ],
  earth: [
    { q: 'What % of Earth is covered by water?', a: ['51%', '61%', '71%', '81%'], correct: 2, why: 'About 71% of the surface is ocean.' },
    { q: 'How long is one Earth rotation (a day)?', a: ['23h 56m', '24h 30m', '25h', '23h'], correct: 0, why: 'A sidereal day is 23h 56m; the solar day averages 24h.' },
    { q: 'What protects Earth from solar radiation?', a: ['The crust', 'The magnetosphere', 'The Moon', 'Clouds'], correct: 1, why: 'Earth\u2019s magnetic field deflects most charged particles.' },
    { q: 'Which layer holds most weather?', a: ['Stratosphere', 'Troposphere', 'Mesosphere', 'Exosphere'], correct: 1, why: 'Nearly all weather happens in the troposphere.' },
  ],
  planet: [
    { q: 'Largest planet in the Solar System?', a: ['Saturn', 'Neptune', 'Jupiter', 'Earth'], correct: 2, why: 'Jupiter — over 1,300 Earths could fit inside.' },
    { q: 'Which planet is hottest?', a: ['Mercury', 'Venus', 'Mars', 'Jupiter'], correct: 1, why: 'Venus, due to a runaway greenhouse atmosphere.' },
    { q: 'Which planet spins on its side?', a: ['Uranus', 'Neptune', 'Saturn', 'Mars'], correct: 0, why: 'Uranus has an axial tilt of about 98°.' },
    { q: 'The "Red Planet" is…', a: ['Jupiter', 'Mars', 'Mercury', 'Venus'], correct: 1, why: 'Mars looks red from iron-oxide dust.' },
  ],
  star: [
    { q: 'What powers a star?', a: ['Combustion', 'Nuclear fusion', 'Friction', 'Magnetism'], correct: 1, why: 'Hydrogen fuses into helium in the core.' },
    { q: 'Brightest star in our night sky?', a: ['Polaris', 'Betelgeuse', 'Sirius', 'Vega'], correct: 2, why: 'Sirius, in Canis Major.' },
    { q: 'What is a red giant?', a: ['A young star', 'A dying star', 'A planet', 'A comet'], correct: 1, why: 'A late life stage as a star expands and cools.' },
    { q: 'Our Sun is classified as a…', a: ['Red giant', 'White dwarf', 'Yellow dwarf', 'Neutron star'], correct: 2, why: 'A G-type main-sequence (yellow dwarf) star.' },
  ],
};

function moonPhaseName(f: number) { return f < 0.03 ? 'New Moon' : f < 0.47 ? 'Waxing Crescent' : f < 0.53 ? 'Half Moon' : f < 0.97 ? 'Waxing Gibbous' : 'Full Moon'; }

function Quiz({ set }: { set: QItem[] }) {
  const [i, setI] = useState(0); const [picked, setPicked] = useState<number | null>(null); const [score, setScore] = useState(0);
  if (i >= set.length) return (
    <div className="text-center">
      <div className="font-display text-5xl text-starlight">{score}/{set.length}</div>
      <p className="mt-2 font-body text-sm text-ash">{score === set.length ? 'Flawless. You know your sky.' : 'Nicely done — try another quiz.'}</p>
      <button onClick={() => { setI(0); setScore(0); setPicked(null); }} className="mt-5 rounded-full border border-white/15 px-5 py-2 font-mono text-[11px] tracking-widest text-starlight transition-colors hover:border-ember/50 hover:text-ember">PLAY AGAIN</button>
    </div>
  );
  const q = set[i];
  return (
    <div>
      <div className="mb-1 font-mono text-[11px] tracking-widest text-ash">QUESTION {i + 1} / {set.length}</div>
      <h3 className="mb-5 font-display text-2xl text-starlight">{q.q}</h3>
      <div className="grid gap-2.5">
        {q.a.map((opt, idx) => {
          const reveal = picked !== null; const ok = idx === q.correct;
          const state = !reveal ? 'idle' : ok ? 'correct' : idx === picked ? 'wrong' : 'dim';
          return <button key={idx} disabled={reveal} onClick={() => { setPicked(idx); if (ok) setScore((v) => v + 1); }}
            className={`rounded-xl border px-4 py-3 text-left font-body text-sm transition-all ${state === 'idle' ? 'border-white/12 text-starlight hover:border-white/30 hover:bg-white/5' : state === 'correct' ? 'border-aurora/60 bg-aurora/10 text-aurora' : state === 'wrong' ? 'border-hazard/60 bg-hazard/10 text-hazard' : 'border-white/8 text-slate'}`}>{opt}</button>;
        })}
      </div>
      {picked !== null && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-body text-sm text-ash">{q.why}</p>
          <button onClick={() => { setI((v) => v + 1); setPicked(null); }} className="mt-3 rounded-full bg-ember px-5 py-2 font-mono text-[11px] tracking-widest text-void transition-transform hover:scale-105">{i + 1 < set.length ? 'NEXT →' : 'SEE SCORE →'}</button>
        </div>
      )}
    </div>
  );
}

function DetailView({ item, onBack }: { item: ArchiveItem; onBack: () => void }) {
  const [ai, setAi] = useState(''); const [aiBusy, setAiBusy] = useState(false); const [imgOk, setImgOk] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) gsap.fromTo(ref.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }); }, []);
  const askAI = async () => {
    setAiBusy(true); setAi('');
    try {
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `Give a vivid, accurate explanation of "${item.title}" for a curious learner. Context: ${item.body}` }) });
      const j = await r.json(); setAi(j?.data?.text || 'No response.');
    } catch { setAi('The AI service is unavailable right now.'); }
    setAiBusy(false);
  };
  const showAside = aiBusy || !!ai;
  const isQuiz = item.kind === 'quiz';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-void">
      <div ref={ref} className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-12">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-[11px] tracking-widest text-starlight transition-colors hover:border-ember/50 hover:text-ember">← BACK TO ARCHIVE</button>

        <div className="relative mb-8 h-64 w-full overflow-hidden rounded-3xl md:h-96" style={{ background: `linear-gradient(135deg, ${item.accent}33, #0b0c0f)` }}>
          {item.image && imgOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.title} onError={() => setImgOk(false)} className="h-full w-full object-cover" />
          ) : <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 30%, ${item.accent}44, transparent 60%), #0b0c0f` }} />}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(8,9,11,0.85))' }} />
          <div className="absolute bottom-0 left-0 p-6 md:p-8">
            <div className="mb-2 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: item.accent }} /><span className="font-mono text-[11px] uppercase tracking-widest text-ash">{item.tag}</span></div>
            <h1 className="font-display text-4xl leading-tight text-starlight md:text-6xl" style={{ fontWeight: 400 }}>{item.title}</h1>
            <div className="mt-2 font-mono text-xs text-ash">{item.meta}</div>
          </div>
        </div>

        {isQuiz ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.02] p-7 md:p-9"><Quiz set={QUIZZES[item.id.replace('quiz-', '')] || QUIZZES.space} /></div>
        ) : item.kind === 'gallery' ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {(item.images || []).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`gallery ${i}`} className="h-40 w-full rounded-2xl object-cover md:h-52" onError={(e) => ((e.currentTarget.style.display = 'none'))} />
            ))}
          </div>
        ) : (
          // card content left, AI result to the RIGHT (no downward scroll)
          <div className={`grid gap-8 ${showAside ? 'md:grid-cols-[1fr_1fr]' : 'md:grid-cols-[1fr_280px]'}`}>
            <div className="transition-all">
              <p className="whitespace-pre-line font-body text-base leading-relaxed text-ash">{item.body}</p>
              {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] tracking-widest text-cyan hover:text-starlight">VISIT SOURCE →</a>}
              <div className="mt-7">
                <button onClick={askAI} disabled={aiBusy} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-ember to-ember-deep px-5 py-2.5 font-mono text-[11px] tracking-widest text-void transition-transform hover:scale-105 disabled:opacity-60">{aiBusy ? 'THINKING…' : '✦ ASK AI TO EXPLAIN'}</button>
              </div>
            </div>
            {showAside ? (
              <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5" style={{ animation: 'fadeUp 0.4s ease' }}>
                <div className="mb-2 font-mono text-[10px] tracking-widest text-ember">AI INSIGHT</div>
                {aiBusy && !ai ? <div className="space-y-2"><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-5/6" /><div className="skeleton h-3 w-2/3" /></div>
                  : <p className="whitespace-pre-line font-body text-sm leading-relaxed text-starlight">{ai}</p>}
              </aside>
            ) : (
              <aside className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"><div className="mb-1 font-mono text-[10px] tracking-widest text-ash">CATEGORY</div><div className="font-body text-sm text-starlight">{item.tag}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"><div className="mb-1 font-mono text-[10px] tracking-widest text-ash">DETAIL</div><div className="font-body text-sm text-starlight">{item.meta}</div></div>
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArchivePage() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [selected, setSelected] = useState<ArchiveItem | null>(null);
  const intro = useRef<HTMLDivElement>(null); const introWord = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !intro.current) { if (intro.current) intro.current.style.display = 'none'; return; }
    const tl = gsap.timeline();
    tl.fromTo(introWord.current, { opacity: 0, y: 18, letterSpacing: '0.5em' }, { opacity: 1, y: 0, letterSpacing: '0.16em', duration: 0.8, ease: 'power3.out' })
      .to(introWord.current, { opacity: 0, y: -14, duration: 0.5, ease: 'power2.in' }, '+=0.3')
      .to(intro.current, { yPercent: -100, duration: 0.8, ease: 'power4.inOut' }, '-=0.1').set(intro.current, { display: 'none' });
  }, []);

  useEffect(() => {
    (async () => {
      const [apod, iss, crew, aurora, launches, neo, donki] = await Promise.all([
        getJSON('/api/apod'), getJSON('/api/iss'), getJSON('/api/crew'), getJSON('/api/aurora'), getJSON('/api/launches'), getJSON('/api/neo'), getJSON('/api/donki'),
      ]);
      const L: ArchiveItem[] = [];

      const a = apod?.data as { title: string; url: string; explanation: string; media_type: string; date: string } | undefined;
      if (a) L.push({ id: 'apod', tag: 'Image of the day', title: a.title, meta: a.date, body: a.explanation, accent: '#3DD8E0', image: a.media_type === 'image' ? a.url : IMG.hubble, kind: 'apod' });

      const i = iss?.data as { lat: number; lon: number; alt: number; vel: number } | undefined;
      if (i) L.push({ id: 'iss', tag: 'Live · station', title: 'International Space Station', meta: `${i.alt.toFixed(0)} km · ${i.vel.toFixed(0)} km/h`, body: `The ISS is over ${i.lat.toFixed(1)}°, ${i.lon.toFixed(1)}°, orbiting at ~${i.alt.toFixed(0)} km and ${i.vel.toFixed(0)} km/h — a lap of the planet every ~92 minutes, so its crew sees about 16 sunrises a day. Continuously crewed since November 2000.`, accent: '#FF8A3D', image: IMG.iss });

      const c = crew?.data as { number: number; people: { name: string; craft: string }[] } | undefined;
      if (c) L.push({ id: 'crew', tag: 'Humans in space', title: `${c.number} people off-planet`, meta: 'live roster', body: 'Right now these people are living and working off Earth:\n\n' + c.people.map((p) => `• ${p.name} — aboard ${p.craft}`).join('\n'), accent: '#4DF0A8', image: IMG.crew });

      const au = aurora?.data as { kp: number; chance: number } | undefined;
      if (au) L.push({ id: 'aurora', tag: 'Space weather', title: `Kp ${au.kp} · aurora ${au.chance}%`, meta: 'NOAA SWPC', body: `The planetary K-index is ${au.kp} on a 0–9 scale. Higher Kp pushes the auroral oval toward lower latitudes and brightens the display. Tonight\u2019s rough visibility chance is around ${au.chance}%.`, accent: '#4DF0A8' });

      const ls = launches?.data as { name: string; net: string; pad: string; rocket: string }[] | undefined;
      if (ls && ls.length) {
        ls.slice(0, 2).forEach((l, idx) => L.push({ id: `launch-${idx}`, tag: idx === 0 ? 'Next launch' : 'Upcoming launch', title: l.name, meta: new Date(l.net).toUTCString().slice(5, 22) + ' UTC', body: `${l.rocket} lifts off from ${l.pad}. Net launch time ${new Date(l.net).toUTCString()}. Windows shift with weather and range constraints.`, accent: '#FF8A3D' }));
        L.push({ id: 'launches-list', tag: 'Manifest', title: 'Upcoming Launches', meta: `${Math.min(ls.length, 5)} scheduled`, accent: '#FF8A3D', body: ls.slice(0, 5).map((l, n) => `${n + 1}. ${l.name}\n    ${l.rocket} · ${new Date(l.net).toUTCString().slice(5, 22)} UTC · ${l.pad}`).join('\n\n') });
      }

      const ns = neo?.data as { name: string; diameter: number; miss: number; velocity: number; hazardous: boolean }[] | undefined;
      ns?.slice(0, 3).forEach((n, idx) => L.push({ id: `neo-${idx}`, tag: n.hazardous ? 'NEO · flagged' : 'Near-Earth object', title: n.name, meta: `${(n.miss / 1000).toFixed(0)}k km · ${n.velocity.toFixed(1)} km/s`, body: `Roughly ${(n.diameter * 1000).toFixed(0)} m across, passing Earth at ${(n.miss / 1000).toFixed(0)},000 km and ${n.velocity.toFixed(1)} km/s. ${n.hazardous ? 'Classified potentially hazardous — a size/distance label, not an impact prediction.' : 'A safe pass.'}`, accent: n.hazardous ? '#FF5C7A' : '#76767C' }));

      const ds = donki?.data as { type: string; class?: string; time: string; note: string }[] | undefined;
      ds?.slice(0, 1).forEach((d, idx) => L.push({ id: `donki-${idx}`, tag: 'Solar activity', title: `${d.type}${d.class ? ` · ${d.class}` : ''}`, meta: d.time ? new Date(d.time).toUTCString().slice(5, 17) : '', body: d.note, accent: '#FF8A3D', image: IMG.sun }));

      const frac = moonIllumination(new Date());
      L.push({ id: 'moon', tag: 'Moon phase', title: moonPhaseName(frac), meta: `${Math.round(frac * 100)}% illuminated`, body: `The Moon is ${Math.round(frac * 100)}% illuminated. Its phase cycles every 29.5 days as the Sun lights different fractions of the near side we always face. The same gravitational lock drives the ocean tides.`, accent: '#A1A1A6', image: IMG.moon });

      // Field guides (with images)
      L.push({ id: 'earth', tag: 'Field guide', title: 'Planet Earth', meta: 'our home world', body: 'The only known world with life. About 71% ocean, wrapped in a nitrogen-oxygen atmosphere and shielded by a magnetic field that deflects the solar wind. A single natural satellite — the Moon — stabilises its tilt and tides.', accent: '#3DD8E0', image: IMG.earth });
      L.push({ id: 'mars', tag: 'Field guide', title: 'Mars', meta: 'the red planet', body: 'A cold desert world with the largest volcano in the Solar System (Olympus Mons) and a canyon system longer than the United States. Its red colour comes from iron-oxide dust. Multiple rovers are exploring it today.', accent: '#FF5C7A', image: IMG.mars });
      L.push({ id: 'saturn', tag: 'Field guide', title: 'Saturn', meta: 'the ringed giant', body: 'A gas giant famous for its spectacular ring system of ice and rock. Despite being the second-largest planet, it is so low in density it would float in water. It hosts over 140 known moons, including Titan and Enceladus.', accent: '#FF8A3D', image: IMG.saturn });
      L.push({ id: 'andromeda', tag: 'Deep sky', title: 'Andromeda Galaxy', meta: '2.5 million light-years', body: 'The nearest major galaxy to the Milky Way and the most distant object visible to the naked eye. It holds about a trillion stars and is on a slow collision course with our galaxy, set to merge in ~4.5 billion years.', accent: '#8B7CFF', image: IMG.andromeda });

      // Gallery
      L.push({ id: 'gallery', tag: 'Gallery', title: 'Cosmic Gallery', meta: 'a tour in pictures', accent: '#8B7CFF', kind: 'gallery', image: IMG.crab, images: [IMG.hubble, IMG.crab, IMG.andromeda, IMG.saturn, IMG.mars, IMG.earth], body: 'A handful of the most striking views in astronomy.' });

      // News cards (with links)
      L.push({ id: 'news-nasa', tag: 'News', title: 'NASA News & Missions', meta: 'nasa.gov', accent: '#3DD8E0', link: 'https://www.nasa.gov/news/', image: IMG.earth, body: 'The latest from NASA — missions, discoveries, and launches across the agency\u2019s science and human-spaceflight programs.' });
      L.push({ id: 'news-esa', tag: 'News', title: 'ESA Space News', meta: 'esa.int', accent: '#4DF0A8', link: 'https://www.esa.int/', image: IMG.saturn, body: 'Updates from the European Space Agency, from Earth observation to deep-space science and the road to the Moon and Mars.' });
      L.push({ id: 'news-hubble', tag: 'News', title: 'Hubble & Webb', meta: 'science.nasa.gov', accent: '#8B7CFF', link: 'https://science.nasa.gov/mission/hubble/', image: IMG.hubble, body: 'New images and findings from the Hubble and James Webb space telescopes — humanity\u2019s sharpest eyes on the universe.' });

      // Daily + quizzes
      L.push({ id: 'fact', tag: 'Space fact of the day', title: 'Did you know?', meta: 'rotates daily', body: FACTS[new Date().getDate() % FACTS.length], accent: '#8B7CFF' });
      const hist = HISTORY[new Date().getDate() % HISTORY.length];
      L.push({ id: 'history', tag: 'This day in space', title: hist.d, meta: 'milestone', body: hist.e, accent: '#3DD8E0' });
      L.push({ id: 'quiz-space', tag: 'Interactive', title: 'Space Quiz', meta: '4 questions', body: 'Test your cosmic knowledge.', accent: '#FF8A3D', kind: 'quiz' });
      L.push({ id: 'quiz-earth', tag: 'Interactive', title: 'Earth Quiz', meta: '4 questions', body: 'How well do you know home?', accent: '#3DD8E0', kind: 'quiz', image: IMG.earth });
      L.push({ id: 'quiz-planet', tag: 'Interactive', title: 'Planet Quiz', meta: '4 questions', body: 'Name that world.', accent: '#FF5C7A', kind: 'quiz', image: IMG.mars });
      L.push({ id: 'quiz-star', tag: 'Interactive', title: 'Star Quiz', meta: '4 questions', body: 'From fusion to red giants.', accent: '#FFB35C', kind: 'quiz' });

      setItems(L);
    })();
  }, []);

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-void text-starlight">
      <ArchiveSphere items={items} selectedId={selected?.id ?? null} onSelect={setSelected} />
      <div className="pointer-events-none absolute inset-0 z-10" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 38%, rgba(8,9,11,0.88) 90%)' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-5 md:p-7">
        <div className="pointer-events-auto">
          <div className="flex items-baseline gap-2"><span className="font-display text-3xl tracking-wide" style={{ fontWeight: 400 }}>The Archive</span><span className="hud-label hidden sm:inline">/ live telemetry</span></div>
          <p className="hud-label mt-2">Drag to look around · arrow keys to pan · click any card</p>
        </div>
        <Link href="/" className="pointer-events-auto rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-[11px] tracking-widest text-starlight backdrop-blur-md transition-all hover:border-ember/50 hover:text-ember">← BACK TO RADAR</Link>
      </div>
      {!items.length && <div className="absolute inset-0 z-20 flex items-center justify-center"><span className="hud-label animate-pulse-soft">assembling archive…</span></div>}
      {selected && <DetailView item={selected} onBack={() => setSelected(null)} />}
      <div ref={intro} className="fixed inset-0 z-[60] flex items-center justify-center bg-void"><div ref={introWord} className="font-display text-5xl tracking-[0.16em] text-starlight md:text-7xl" style={{ fontWeight: 380 }}>Archive</div></div>
    </main>
  );
}

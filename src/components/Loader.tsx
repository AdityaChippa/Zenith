'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useZenith } from '@/lib/store';

export default function Loader() {
  const progress = useZenith((s) => s.progress);
  const phase = useZenith((s) => s.phase);
  const setPhase = useZenith((s) => s.setPhase);
  const reduced = useZenith((s) => s.reducedMotion);

  const root = useRef<HTMLDivElement>(null);
  const wordInner = useRef<HTMLSpanElement>(null);
  const orbit = useRef<HTMLDivElement>(null);
  const sweep = useRef<HTMLDivElement>(null);
  const wipe = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (reduced) return;
    const tl = gsap.timeline();
    tl.fromTo(wordInner.current, { yPercent: 118 }, { yPercent: 0, duration: 1.1, ease: 'power4.out' })
      .fromTo('.zenith-rise', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out' }, 0.35)
      .fromTo(sweep.current, { xPercent: -140 }, { xPercent: 140, duration: 1.4, ease: 'power2.inOut' }, 0.5)
      .fromTo(orbit.current, { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.5);
    const spin = gsap.to(orbit.current, { rotate: 360, duration: 6, ease: 'none', repeat: -1 });
    return () => { tl.kill(); spin.kill(); };
  }, [reduced]);

  useEffect(() => { if (fill.current) gsap.to(fill.current, { scaleX: progress / 100, duration: 0.4, ease: 'power2.out' }); }, [progress]);

  useEffect(() => {
    if (progress < 100 || fired.current) return;
    fired.current = true;
    if (reduced) { setPhase('globe'); setGone(true); return; }
    const tl = gsap.timeline({ onComplete: () => { setPhase('globe'); setGone(true); } });
    tl.to('.zenith-rise', { opacity: 0, y: -10, duration: 0.45, ease: 'power2.in' }, 0)
      .to(orbit.current, { opacity: 0, scale: 1.3, duration: 0.5 }, 0)
      .to(wordInner.current, { yPercent: -118, duration: 0.85, ease: 'power4.inOut' }, 0.2)
      .fromTo(wipe.current, { scaleY: 0, transformOrigin: 'bottom' }, { scaleY: 1, duration: 0.6, ease: 'power4.inOut' }, 0.45)
      .to(root.current, { opacity: 0, duration: 0.5, ease: 'power2.inOut' }, 1.05);
    return () => { tl.kill(); };
  }, [progress, reduced, setPhase]);

  if (gone || phase !== 'loading') return null;
  const nn = String(Math.floor(progress)).padStart(2, '0');

  return (
    <div ref={root} className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-void">
      {/* faint concentric rings */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]">
        <div className="h-[120vmin] w-[120vmin] rounded-full border border-starlight" />
        <div className="absolute h-[78vmin] w-[78vmin] rounded-full border border-starlight" />
        <div className="absolute h-[40vmin] w-[40vmin] rounded-full border border-starlight" />
      </div>

      {/* orbiting accent dot around the wordmark */}
      <div ref={orbit} className="pointer-events-none absolute h-[46vmin] w-[46vmin] rounded-full" style={{ opacity: 0 }}>
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-ember shadow-[0_0_16px_4px_rgba(255,138,61,0.6)]" />
      </div>

      <p className="zenith-rise mb-5 font-mono text-[11px] tracking-[0.4em] text-ash">THE CELESTIAL EYE</p>

      <div className="relative overflow-hidden px-4 py-1">
        <span ref={wordInner} className="block font-display text-[20vw] leading-[0.9] tracking-[0.01em] text-starlight md:text-[13vw]" style={{ fontWeight: 360 }}>Zenith</span>
        <div ref={sweep} className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(100deg, transparent 40%, rgba(255,138,61,0.30) 50%, transparent 60%)', mixBlendMode: 'screen' }} />
      </div>

      <div className="zenith-rise mt-10 w-[min(420px,72vw)]">
        <div className="mb-2 flex items-end justify-between">
          <span className="font-mono text-[10px] tracking-widest text-ash">ESTABLISHING UPLINK</span>
          <span className="font-mono text-sm tabular-nums text-starlight">{nn}<span className="text-slate"> / 100</span></span>
        </div>
        <div className="h-px w-full bg-white/12"><div ref={fill} className="h-px origin-left bg-gradient-to-r from-ember to-ember-deep" style={{ transform: 'scaleX(0)' }} /></div>
      </div>

      <p className="zenith-rise mt-6 max-w-sm text-center font-body text-xs leading-relaxed text-slate">Resolving your sky — satellites, the ISS, planets and constellations directly overhead, in real time.</p>

      <div ref={wipe} className="pointer-events-none absolute inset-0 z-50 bg-ink" style={{ transform: 'scaleY(0)' }} />
    </div>
  );
}

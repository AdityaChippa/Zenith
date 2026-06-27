'use client';

import { useRef } from 'react';
import { useZenith } from '@/lib/store';

/**
 * Segmented switch shown in the zenith phase. Flips between the naked-eye sky
 * (our minimal view) and the Radar (the ported demo instrument view), with a
 * subtle radial fade so the canvas swap never pops.
 */
export default function SkyModeSwitch() {
  const phase = useZenith((s) => s.phase);
  const skyMode = useZenith((s) => s.skyMode);
  const setSkyMode = useZenith((s) => s.setSkyMode);
  const fadeRef = useRef<HTMLDivElement>(null);

  if (phase !== 'dome') return null;
  const naked = skyMode === 'naked';

  function switchTo(mode: 'enhanced' | 'naked') {
    if (mode === skyMode) return;
    const el = fadeRef.current;
    if (el) {
      el.style.display = 'block';
      const anim = el.animate(
        [{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }],
        { duration: 900, easing: 'cubic-bezier(0.4,0,0.2,1)' },
      );
      setTimeout(() => setSkyMode(mode), 380);
      anim.onfinish = () => { if (el) el.style.display = 'none'; };
    } else {
      setSkyMode(mode);
    }
  }

  return (
    <>
      <div className="pointer-events-auto fixed left-1/2 top-5 z-[60] -translate-x-1/2 text-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/40 p-1 backdrop-blur-md">
          <button
            onClick={() => switchTo('naked')}
            className={`rounded-full px-4 py-1.5 font-mono text-[10px] tracking-widest transition-all ${naked ? 'bg-starlight text-void' : 'text-ash hover:text-starlight'}`}
          >
            ◐ NAKED EYE
          </button>
          <button
            onClick={() => switchTo('enhanced')}
            className={`rounded-full px-4 py-1.5 font-mono text-[10px] tracking-widest transition-all ${!naked ? 'bg-[#4FE3C1] text-[#05060A]' : 'text-ash hover:text-starlight'}`}
          >
            ✦ RADAR
          </button>
        </div>
        <div className="mt-1 font-mono text-[8px] tracking-widest text-slate">
          {naked ? 'just stars + patterns, as the eye sees' : 'live satellites · planets · instruments'}
        </div>
      </div>

      {/* transition veil */}
      <div
        ref={fadeRef}
        className="pointer-events-none fixed inset-0 z-[59] hidden"
        style={{ background: 'radial-gradient(circle at 50% 45%, #0b0e16, #05060a)' }}
      />
    </>
  );
}

'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Loader from './Loader';
import Hud from './Hud';
import SkyModeSwitch from './SkyModeSwitch';
import { useBootstrap } from '@/lib/useBootstrap';
import { useZenith } from '@/lib/store';

// WebGL scene is client-only — never server-rendered (window/Three access).
const Experience = dynamic(() => import('./scene/Experience'), {
  ssr: false,
  loading: () => null,
});
// Enhanced view = ported demo zenith (its own canvas + worker). Client-only.
const EnhancedSky = dynamic(() => import('./EnhancedSky'), {
  ssr: false,
  loading: () => null,
});

export default function SceneRoot() {
  useBootstrap();
  const setLocation = useZenith((s) => s.setLocation);
  const setScrubMinutes = useZenith((s) => s.setScrubMinutes);
  const phase = useZenith((s) => s.phase);
  const skyMode = useZenith((s) => s.skyMode);

  // Shareable sky link: ?lat=&lon=&t= overrides the resolved view.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const lat = p.get('lat');
    const lon = p.get('lon');
    const t = p.get('t');
    if (lat && lon) {
      setLocation({ lat: Number(lat), lon: Number(lon), label: `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}` });
    }
    if (t) {
      const mins = Math.round((Number(t) - Date.now()) / 60000);
      if (Number.isFinite(mins)) setScrubMinutes(mins);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enhanced = phase === 'dome' && skyMode === 'enhanced';

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-void">
      {enhanced ? (
        <EnhancedSky />
      ) : (
        <>
          <Experience />
          <Hud />
        </>
      )}
      <SkyModeSwitch />
      <Loader />
    </main>
  );
}

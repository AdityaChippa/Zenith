'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useStore as useDemoStore } from '@/demo/state/useStore';
import SkyEngineDriver from '@/demo/components/SkyEngineDriver';
import DemoHud from '@/demo/components/hud/Hud';
import { demoBridge } from '@/demo/bridge';
import { useZenith } from '@/lib/store';

// The ported demo zenith canvas (its own R3F Canvas). Client-only.
const ZenithCanvas = dynamic(() => import('@/demo/components/three/ZenithCanvas'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <div className="eyebrow animate-pulse text-dzsignal/70">Aligning the instrument…</div>
    </div>
  ),
});

/**
 * Enhanced view = the demo's zenith experience, ported verbatim and isolated under
 * `.demo-zenith`. We feed it our observer location and route its "← Globe" back to us.
 */
export default function EnhancedSky() {
  const location = useZenith((s) => s.location);
  const setPhase = useZenith((s) => s.setPhase);

  // mount: push our location into the demo store, enter its sky, wire the back button
  useEffect(() => {
    const ds = useDemoStore.getState();
    ds.setObserver({ latDeg: location.lat, lonDeg: location.lon }, location.label);
    ds.enterSky();
    ds.goLive();
    demoBridge.onExit = () => setPhase('globe');
    return () => {
      demoBridge.onExit = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the demo observer aligned if our location changes
  useEffect(() => {
    useDemoStore.getState().setObserver({ latDeg: location.lat, lonDeg: location.lon }, location.label);
  }, [location]);

  return (
    <div className="demo-zenith fixed inset-0 z-30 bg-dzvoid">
      <ZenithCanvas />
      <SkyEngineDriver />
      <DemoHud />
    </div>
  );
}

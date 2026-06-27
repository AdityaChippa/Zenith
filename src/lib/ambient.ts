'use client';

// A gentle ambient pad generated with the Web Audio API — no asset downloads.
// start()/stop() are idempotent and fade smoothly. Must be triggered by a user
// gesture (the Sound toggle), which satisfies browser autoplay policies.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voices: OscillatorNode[] = [];
let lfo: OscillatorNode | null = null;
let running = false;

export function startAmbient() {
  if (running) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') ctx.resume();

    master = ctx.createGain();
    master.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.7;
    master.connect(filter);
    filter.connect(ctx.destination);

    // a slow detuned chord — deep, calm, "space"
    const freqs = [55, 82.4, 110, 164.8];
    voices = freqs.map((f, i) => {
      const o = ctx!.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 4;
      const g = ctx!.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.22 / i;
      o.connect(g);
      g.connect(master!);
      o.start();
      return o;
    });

    // gentle shimmer
    lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    master.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.4);
    running = true;
  } catch {
    /* audio unsupported */
  }
}

export function stopAmbient() {
  if (!running || !ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0, now + 0.8);
  const toStop = [...voices, lfo].filter(Boolean) as OscillatorNode[];
  setTimeout(() => { toStop.forEach((o) => { try { o.stop(); } catch { /* */ } }); }, 900);
  voices = [];
  lfo = null;
  running = false;
}

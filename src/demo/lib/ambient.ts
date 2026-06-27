// Tasteful ambient drone built with the Web Audio API. Off by default.
// Two detuned oscillators through a low-pass filter with a slow gain swell.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let nodes: OscillatorNode[] = [];

export function startAmbient() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    filter.Q.value = 0.6;
    filter.connect(master);

    const freqs = [55, 82.41, 110]; // A1, E2, A2
    for (const f of freqs) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.12;
      o.connect(g);
      g.connect(filter);
      o.start();
      nodes.push(o);
    }

    // slow swell LFO on the master gain
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();
    nodes.push(lfo);

    master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2.5);
  } catch {
    ctx = null;
  }
}

export function stopAmbient() {
  if (!ctx || !master) return;
  try {
    master.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.6);
    const old = ctx;
    const oldNodes = nodes;
    setTimeout(() => {
      oldNodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* noop */
        }
      });
      old.close();
    }, 700);
  } catch {
    /* noop */
  }
  ctx = null;
  master = null;
  nodes = [];
}

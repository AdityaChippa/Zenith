import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Monochrome base: black, near-blacks, greys, white ──────────────
        void: '#08090B',       // page base (near-black)
        ink: '#0E0F12',        // surface
        panel: '#16181D',      // raised surface
        graphite: '#202329',   // hairlines / strokes
        starlight: '#F5F5F7',  // primary text (white)
        ash: '#A1A1A6',        // secondary text
        slate: '#76767C',      // tertiary text / muted
        // ── Vibrant accents — used ONLY for highlights ─────────────────────
        ember: '#FF8A3D',      // primary accent (the Zenith signature)
        'ember-deep': '#FF5E2C',
        cyan: '#3DD8E0',
        aurora: '#4DF0A8',
        violet: '#8B7CFF',
        hazard: '#FF5C7A',
        // ── Demo-zenith ("Enhanced view") tokens, namespaced to avoid clashes ──
        dzvoid: '#05060A',
        dzpanel: '#0B0E16',
        dzpanel2: '#11151F',
        dzink: '#E8ECF5',
        dzmuted: '#6B7488',
        dzsignal: '#4FE3C1',
        dzember: '#FFB35C',
        dzhairline: 'rgba(232,236,245,0.08)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        dzdisplay: ['var(--font-dzdisplay)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        wider2: '0.18em',
        widest2: '0.32em',
      },
      transitionTimingFunction: {
        zenith: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'grain-shift': {
          '0%,100%': { transform: 'translate(0,0)' },
          '50%': { transform: 'translate(-1.5%, 1%)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        grain: 'grain-shift 8s steps(6) infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;

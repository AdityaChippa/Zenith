import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Display serif (loader wordmark + hero). Fraunces variable, used with restraint.
const fraunces = localFont({
  src: '../fonts/Fraunces.ttf',
  variable: '--font-display',
  weight: '300 900',
  display: 'swap',
});

// Telemetry / HUD. IBM Plex Mono — instrument-grade.
const plexMono = localFont({
  src: [
    { path: '../fonts/IBMPlexMono-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/IBMPlexMono-Medium.ttf', weight: '500', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
});

// Body / UI labels.
const inter = localFont({
  src: '../fonts/Inter.ttf',
  variable: '--font-body',
  weight: '300 800',
  display: 'swap',
});

// Enhanced view (ported demo) — Space Grotesk, geometric instrument sans.
const spaceGrotesk = localFont({
  src: '../fonts/SpaceGrotesk-Variable.woff2',
  variable: '--font-dzdisplay',
  weight: '300 700',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Zenith · The Celestial Eye',
  description:
    'A real-time cosmic radar. Point at any place on Earth and see what is directly above you right now — the ISS, satellites, planets, constellations, aurora and launches.',
  applicationName: 'Project Zenith',
  openGraph: {
    title: 'Zenith · The Celestial Eye',
    description: 'What is directly above you right now?',
    type: 'website',
  },
  metadataBase: new URL('https://zenith.example.com'),
};

export const viewport: Viewport = {
  themeColor: '#05070D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plexMono.variable} ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="grain bg-void text-starlight antialiased">{children}</body>
    </html>
  );
}

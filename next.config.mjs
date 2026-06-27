/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three + drei ship untranspiled ESM that older bundler paths choke on.
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  // TypeScript errors still fail the build (type safety enforced); ESLint is run
  // separately via `npm run lint` so production builds never block on lint config.
  eslint: { ignoreDuringBuilds: true },
  images: {
    // APOD / EPIC return images on these hosts; allow them for next/image if used.
    remotePatterns: [
      { protocol: 'https', hostname: 'apod.nasa.gov' },
      { protocol: 'https', hostname: 'epic.gsfc.nasa.gov' },
      { protocol: 'https', hostname: 'images-assets.nasa.gov' },
    ],
  },
};

export default nextConfig;

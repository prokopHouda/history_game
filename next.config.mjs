/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Old multiplayer URL (history) — now lives under /play/history/multiplayer
      {
        source: '/multiplayer',
        destination: '/play/history/multiplayer',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

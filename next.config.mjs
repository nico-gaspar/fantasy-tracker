/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.llt-services.com" },
    ],
  },
};

export default nextConfig;

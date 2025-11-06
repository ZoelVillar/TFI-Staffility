import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // cualquiera de las dos sirve; remotePatterns te da más control
    domains: ["api.dicebear.com"],
    // o:
    // remotePatterns: [{ protocol: "https", hostname: "api.dicebear.com" }],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;

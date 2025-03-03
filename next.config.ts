import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // {
      //   protocol: "https",
      //   hostname: "image.mux.com",
      // },
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "inferred.litix.io",
      },
      {
        protocol: "https",
        hostname: "bei6v3jjnw.ufs.sh",
      },
    ],
  },
};


export default nextConfig;
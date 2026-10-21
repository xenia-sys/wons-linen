import type { NextConfig } from "next";
const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imgjlzoodxggihhljojf.supabase.co",
        pathname: "/storage/v1/object/public/product-images/**",
      },
    ],
  },
};
export default config;

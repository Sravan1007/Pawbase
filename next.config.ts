import type { NextConfig } from "next";

// next/image refuses to render any external hostname that isn't explicitly
// allowlisted. Medication photos and (eventually) pet photos live in
// Supabase Storage, so derive that hostname from the same env var the app
// already uses rather than hardcoding a project-specific URL.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/**",
          },
        ]
      : [],
  },
};

export default nextConfig;

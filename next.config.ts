import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

function supabaseImagePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return null;
    return {
      protocol: protocol.replace(":", "") as "https" | "http",
      hostname,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const supabasePattern = supabaseImagePattern();

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  async redirects() {
    return [
      {
        source: "/map",
        destination: "/trending",
        permanent: true,
      },
      {
        source: "/dossiers",
        destination: "/trending",
        permanent: true,
      },
      {
        source: "/dossier/:id",
        destination: "/trending",
        permanent: true,
      },
      {
        source: "/archives",
        destination: "/trending",
        permanent: true,
      },
      {
        source: "/archives/:slug",
        destination: "/trending",
        permanent: true,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
      ...(supabasePattern ? [supabasePattern] : []),
    ],
  },
};

export default withBundleAnalyzer(nextConfig);

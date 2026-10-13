import type { NextConfig } from "next";

// Parse the public storage URL to build a remotePattern for next/image.
// NEXT_PUBLIC_STORAGE_URL should be set to the base URL of your storage bucket
// (e.g. https://cdn.example.com or http://localhost:9000/bucket-name).
// Falls back to the MinIO dev default when the variable is absent.
const storageUrl = new URL(
  process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:9000"
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: storageUrl.protocol.replace(":", "") as "http" | "https",
        hostname: storageUrl.hostname,
        // Only set port when the URL explicitly includes one (avoids setting
        // an empty string, which would block the default 80/443 ports).
        ...(storageUrl.port ? { port: storageUrl.port } : {}),
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

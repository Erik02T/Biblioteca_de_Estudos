import type { NextConfig } from "next";

const apiUrlValue = process.env.NEXT_PUBLIC_API_URL;
const apiUrl = apiUrlValue ? new URL(apiUrlValue) : undefined;
const storageUrlValue = process.env.NEXT_PUBLIC_STORAGE_URL;
const storageUrl = storageUrlValue ? new URL(storageUrlValue) : undefined;

const isLoopbackHost = (hostname: string) => {
  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname === "::1" ||
    normalizedHostname === "[::1]" ||
    normalizedHostname === "0.0.0.0" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalizedHostname)
  );
};

if (process.env.NODE_ENV === "production") {
  for (const [name, url] of [
    ["NEXT_PUBLIC_API_URL", apiUrl],
    ["NEXT_PUBLIC_STORAGE_URL", storageUrl],
  ] as const) {
    if (url && isLoopbackHost(url.hostname)) {
      throw new Error(`${name} must not use a loopback host in production.`);
    }
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: storageUrl
      ? [
          {
            protocol: storageUrl.protocol.replace(":", "") as "http" | "https",
            hostname: storageUrl.hostname,
            ...(storageUrl.port ? { port: storageUrl.port } : {}),
            pathname: "/**",
          },
        ]
      : [],
  },
};

export default nextConfig;

const loopbackHosts = ['localhost', '127.0.0.1', '[::1]'];

export function createCorsOptions(frontendUrl?: string) {
  const allowed = new Set(['http://localhost:3000', 'http://localhost:3001']);
  for (const origin of frontendUrl?.split(',') ?? []) {
    if (origin.trim()) allowed.add(origin.trim().replace(/\/$/, ''));
  }
  // Equivalent loopback names are allowed only on the same explicit port/protocol.
  for (const origin of [...allowed]) {
    try {
      const url = new URL(origin);
      if (loopbackHosts.includes(url.hostname)) {
        for (const hostname of loopbackHosts) {
          url.hostname = hostname;
          allowed.add(url.origin);
        }
      }
    } catch {
      /* Invalid configured entries never become permissive wildcards. */
    }
  }
  return {
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) {
      if (
        !origin ||
        allowed.has(origin) ||
        /^https:\/\/[^/]+\.vercel\.app$/.test(origin)
      )
        callback(null, true);
      else callback(new Error('Origem não autorizada pelo CORS'));
    },
  };
}

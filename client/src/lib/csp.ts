const R2_CONNECT_SOURCES = [
  "https://*.r2.cloudflarestorage.com",
  "https://*.r2.dev",
];

function originFor(
  value: string | undefined,
  websocket = false
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (websocket) {
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean
): string {
  const connectSources = new Set<string>(["'self'"]);
  const apiOrigin = originFor(process.env.NEXT_PUBLIC_API_URL);
  const socketOrigin = originFor(process.env.NEXT_PUBLIC_SOCKET_URL, true);

  if (apiOrigin) connectSources.add(apiOrigin);
  if (socketOrigin) connectSources.add(socketOrigin);
  for (const source of R2_CONNECT_SOURCES) connectSources.add(source);

  if (isDevelopment) {
    // Next's HMR socket and local API servers.
    connectSources.add("http://localhost:*");
    connectSources.add("ws://localhost:*");
    connectSources.add("http://127.0.0.1:*");
    connectSources.add("ws://127.0.0.1:*");
  }

  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ];

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    // Nonces do not cover style attributes emitted by React/Tailwind.
    "style-src 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    `connect-src ${Array.from(connectSources).join(" ")}`,
    "img-src 'self' blob: data: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}

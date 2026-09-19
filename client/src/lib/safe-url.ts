const ALLOWED_PROTOCOLS = ["http:", "https:", "blob:"];

export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const base =
      typeof window === "undefined" ? undefined : window.location.href;
    const parsed = new URL(trimmed, base);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol) ? trimmed : null;
  } catch {
    return null;
  }
}

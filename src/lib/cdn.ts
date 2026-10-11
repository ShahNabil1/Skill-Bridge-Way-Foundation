/** Every stored R2 file is served through the custom CDN domain. */
export const CDN_BASE = "https://cdn.skillbridgeway.org/";

export function cdnUrl(key?: string | null) {
  if (!key) return null;
  if (/^https?:\/\//.test(key) || key.startsWith("/")) return key;
  return CDN_BASE + key.replace(/^\/+/, "");
}

/** Cloudflare Image Transformations URL: resized, AVIF/WebP negotiated, cached at the edge. */
export function cdnImage(key: string | null | undefined, width: number) {
  if (!key || /^https?:\/\//.test(key) || key.startsWith("/")) return cdnUrl(key);
  return `${CDN_BASE}cdn-cgi/image/width=${width},format=auto,quality=82,fit=scale-down/${key.replace(/^\/+/, "")}`;
}

/** Responsive src/srcSet for a stored image shown at roughly `sizes` wide. */
export function cdnImageSet(key: string | null | undefined, widths: number[] = [400, 640, 960], sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw") {
  const src = cdnImage(key, widths[Math.min(1, widths.length - 1)]!);
  if (!src || !key || /^https?:\/\//.test(key) || key.startsWith("/")) return { src: src ?? undefined };
  return { src, srcSet: widths.map((w) => `${cdnImage(key, w)} ${w}w`).join(", "), sizes };
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

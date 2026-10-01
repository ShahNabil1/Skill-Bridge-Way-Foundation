/** Every stored R2 file is served through the custom CDN domain. */
export const CDN_BASE = "https://cdn.skillbridgeway.org/";

export function cdnUrl(key?: string | null) {
  if (!key) return null;
  if (/^https?:\/\//.test(key) || key.startsWith("/")) return key;
  return CDN_BASE + key.replace(/^\/+/, "");
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

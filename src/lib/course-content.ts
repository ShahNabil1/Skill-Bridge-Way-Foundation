export const COURSE_LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"] as const;
export const DURATION_UNITS = [{ v: "days", label: "Days", max: 60 }, { v: "weeks", label: "Weeks", max: 52 }, { v: "months", label: "Months", max: 24 }] as const;
export const MAX_COURSE_IMAGES = 5;
/** 16:9 at 1600×900 looks sharp on phones, laptops and 4K screens alike and matches social previews. */
export const COURSE_IMAGE = { w: 1600, h: 900, aspect: 16 / 9 };

export function durationLabel(value?: number | null, unit?: string | null, fallback?: string | null) {
  if (value && unit) { const u = unit.replace(/s$/, ""); return `${value} ${u[0]!.toUpperCase()}${u.slice(1)}${value > 1 ? "s" : ""}`; }
  return fallback ?? null;
}

export function youtubeId(url?: string | null) {
  if (!url) return null;
  const m = url.trim().match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

/** Deterministic (SSR == client) cleanup of admin-authored HTML. */
export function sanitizeHtml(html: string) {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|meta|link|input|button)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*(javascript|vbscript|data:text)[^"']*\2/gi, '$1="#"');
}

/** Old plain-text descriptions become paragraphs; rich HTML is sanitized. */
export function descriptionHtml(d?: string | null) {
  if (!d) return "";
  if (/<[a-z][\s\S]*>/i.test(d)) return sanitizeHtml(d);
  const esc = d.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

export function plainText(html?: string | null) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export type ApplyState = { phase: "open" | "upcoming" | "closed"; target: number | null };
export function applyState(start?: string | null, end?: string | null, now = Date.now()): ApplyState {
  const s = start ? Date.parse(start) : null, e = end ? Date.parse(end) : null;
  if (s && now < s) return { phase: "upcoming", target: s };
  if (e && now > e) return { phase: "closed", target: null };
  return { phase: "open", target: e };
}

export const imagesOf = (c: { image_keys?: unknown; cover_image_key?: string | null }) => {
  const list = Array.isArray(c.image_keys) ? (c.image_keys as string[]).filter((k) => typeof k === "string") : [];
  return list.length ? list : c.cover_image_key ? [c.cover_image_key] : [];
};

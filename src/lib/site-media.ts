import { CDN_BASE } from "./cdn";

/**
 * Fixed site photos live in R2 under `site/v1/` and are served from the CDN
 * with a one-year immutable cache. To replace a photo, upload it under a new
 * version folder (e.g. `site/v2/`) and bump SITE_MEDIA_VERSION.
 */
const SITE_MEDIA_VERSION = "v1";
const base = `${CDN_BASE}site/${SITE_MEDIA_VERSION}/`;

const key = `site/${SITE_MEDIA_VERSION}/`;
/** Cloudflare-resized variant (AVIF/WebP negotiated) of a fixed site photo. */
const sized = (file: string, w: number) => `${CDN_BASE}cdn-cgi/image/width=${w},format=auto,quality=75,fit=scale-down/${key}${file}`;

function hero(name: string) {
  const lg = `${base}${name}-1600.webp`;
  return { src: lg, srcSet: `${sized(`${name}-800.webp`, 480)} 480w, ${sized(`${name}-800.webp`, 640)} 640w, ${sized(`${name}-800.webp`, 800)} 800w, ${sized(`${name}-1600.webp`, 1200)} 1200w, ${lg} 1600w`, sizes: "100vw" };
}

function portrait(file: string) {
  return { src: `${base}${file}`, srcSet: [320, 480, 640].map((w) => `${sized(file, w)} ${w}w`).join(", "), sizes: "(min-width: 640px) 384px, calc(100vw - 48px)" };
}

export const siteMedia = {
  homeHero: hero("home"),
  aboutHero: hero("about"),
  partnerHero: hero("partner"),
  coursesHero: hero("courses"),
  chairmanPortrait: portrait("md-saiful-azam-chairman.webp"),
  directorPortrait: portrait("ziaul-haque-manik.webp"),
};

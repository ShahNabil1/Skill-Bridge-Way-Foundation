import { CDN_BASE } from "./cdn";

/**
 * Fixed site photos live in R2 under `site/v1/` and are served from the CDN
 * with a one-year immutable cache. To replace a photo, upload it under a new
 * version folder (e.g. `site/v2/`) and bump SITE_MEDIA_VERSION.
 */
const SITE_MEDIA_VERSION = "v1";
const base = `${CDN_BASE}site/${SITE_MEDIA_VERSION}/`;

function hero(name: string) {
  const sm = `${base}${name}-800.webp`;
  const lg = `${base}${name}-1600.webp`;
  return { src: lg, srcSet: `${sm} 800w, ${lg} 1600w`, sizes: "100vw" };
}

export const siteMedia = {
  homeHero: hero("home"),
  aboutHero: hero("about"),
  partnerHero: hero("partner"),
  coursesHero: hero("courses"),
  chairmanPortrait: `${base}md-saiful-azam-chairman.webp`,
  directorPortrait: `${base}ziaul-haque-manik.webp`,
};

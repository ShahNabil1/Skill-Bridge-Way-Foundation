// GA4 (gtag.js) for public pages only. Private areas are never tracked:
// admin, auth/sign-in/recovery, and private application links.
declare global {
  interface Window { dataLayer: unknown[]; gtag?: (...args: unknown[]) => void }
}

const MEASUREMENT_ID = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY'] as string | undefined;
const PRIVATE_PATH = /^\/(admin|auth|application)(\/|$)/;

let loaded = false;

export const isTrackablePath = (path: string) => !PRIVATE_PATH.test(path);

function load() {
  if (loaded || !MEASUREMENT_ID || typeof window === "undefined") return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag.js needs the Arguments object
    window.dataLayer.push(arguments);
  };
  // Events queue in dataLayer immediately; the heavy gtag.js file loads only on the first real
  // interaction so it never competes with first paint.
  let injected = false;
  const inject = () => {
    if (injected) return;
    injected = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(s);
  };
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((e) => window.addEventListener(e, inject, { once: true, passive: true }));
  window.gtag("set", "developer_id.dZjgwMW", true);
  window.gtag("js", new Date());
  // Page views are sent manually on route change (SPA).
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false, allow_google_signals: false });
  document.addEventListener("click", onDocumentClick, { capture: true });
}

function currentPath() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

export function trackPageView(path: string) {
  if (!isTrackablePath(path)) return;
  load();
  window.gtag?.("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path + window.location.search.replace(/([?&])(token|serial)=[^&]*/g, "$1$2=redacted"),
    page_title: document.title,
  });
}

/** Sends a custom event — silently ignored on private pages or when GA isn't configured. */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !isTrackablePath(currentPath()) || !window.gtag) return;
  window.gtag("event", name, params);
}

// One delegated listener covers every link on public pages: contact, social,
// outbound, apply CTAs and file downloads — no per-button wiring needed.
function onDocumentClick(e: MouseEvent) {
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a) return;
  const href = a.getAttribute("href") ?? "";
  const label = (a.textContent ?? "").trim().slice(0, 80);
  const page = currentPath();
  if (href.startsWith("https://wa.me/")) return trackEvent("contact_whatsapp", { link_text: label, page });
  if (href.startsWith("mailto:")) return trackEvent("contact_email", { link_text: label, page });
  if (href.startsWith("tel:")) return trackEvent("contact_phone", { link_text: label, page });
  let url: URL;
  try { url = new URL(a.href); } catch { return; }
  if (url.origin !== window.location.origin) {
    const social = /facebook|instagram|linkedin|youtube/.exec(url.hostname)?.[0];
    if (social) return trackEvent("social_click", { network: social, page });
    if (/\.pdf($|\?)/i.test(url.pathname)) return trackEvent("file_download", { file_extension: "pdf", link_url: url.href });
    return trackEvent("outbound_click", { link_domain: url.hostname, link_url: url.href, page });
  }
  if (url.pathname === "/admission") return trackEvent("begin_application", { course: url.searchParams.get("course") ?? undefined, link_text: label, page });
  if (/apply/i.test(label)) return trackEvent("apply_cta_click", { link_text: label, destination: url.pathname, page });
  if (url.pathname === "/partner") return trackEvent("partner_interest", { link_text: label, page });
}

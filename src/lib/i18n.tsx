import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { translateTexts } from "@/lib/translate.functions";
import { Button } from "@/components/ui/button";

export type Lang = "en" | "bn";
const COOKIE = "sbf_lang";
const CACHE_KEY = (l: Lang) => `sbf_i18n_${l}_v1`;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });
export const useLang = () => useContext(LangContext);

function readInitialLang(): Lang {
  const url = new URLSearchParams(window.location.search).get("lang");
  if (url === "bn" || url === "en") return url;
  const m = document.cookie.match(/(?:^|; )sbf_lang=(bn|en)/);
  return (m?.[1] as Lang) ?? "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => { setLangState(readInitialLang()); }, []);
  useEffect(() => {
    if (!document.getElementById("public-root")) document.documentElement.lang = lang;
    document.cookie = `${COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    const url = new URL(window.location.href);
    if (url.searchParams.has("lang")) { url.searchParams.delete("lang"); window.history.replaceState(window.history.state, "", url); }
  }, []);
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

/* ---------- automatic page translation (both directions) ---------- */

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "CODE", "PRE", "SVG", "KBD"]);
const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
const BN = /[\u0980-\u09FF]/;
const LATIN = /[A-Za-z]{2,}/;

export function needsTranslation(text: string, lang: Lang) {
  const t = text.trim();
  if (!t || t.length > 4000) return false;
  if (lang === "bn") return LATIN.test(t) && !/^(https?:\/\/|www\.|[\w.+-]+@[\w-]+\.)\S*$/.test(t);
  return BN.test(t);
}

function skipped(el: Element | null) {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName.toUpperCase())) return true;
    if (e.getAttribute("translate") === "no" || e.classList.contains("notranslate") || (e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function loadCache(l: Lang): Map<string, string> {
  try { return new Map(Object.entries(JSON.parse(localStorage.getItem(CACHE_KEY(l)) ?? "{}"))); } catch { return new Map(); }
}

export function PageTranslator({ rootId, active }: { rootId: string; active: boolean }) {
  const { lang } = useLang();
  const caches = useRef<Partial<Record<Lang, Map<string, string>>>>({});
  const originals = useRef({ text: new WeakMap<Text, string>(), textMine: new WeakMap<Text, string>(), attrs: new WeakMap<Element, Record<string, string>>(), attrMine: new WeakMap<Element, Record<string, string>>() });

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || !active) return;
    const dict = (caches.current[lang] ??= loadCache(lang));
    const { text: textOrig, textMine, attrs: attrOrig, attrMine } = originals.current;
    let writes: Array<() => void> = [];
    let committing = false;
    const pending = new Set<string>();
    const inflight = new Set<string>();
    let timer: number | undefined;
    let disposed = false;

    const translateValue = (orig: string): string | null => {
      if (!needsTranslation(orig, lang)) return orig;
      const core = orig.trim();
      const hit = dict.get(core);
      if (hit === undefined) { if (!inflight.has(core)) pending.add(core); return null; }
      return orig.replace(core, hit);
    };

    const doText = (node: Text) => {
      const current = node.nodeValue ?? "";
      if (textMine.get(node) !== current) textOrig.set(node, current);
      const orig = textOrig.get(node) ?? current;
      if (skipped(node.parentElement)) return;
      const next = translateValue(orig);
      const value = next ?? orig;
      if (value !== current) writes.push(() => { node.nodeValue = value; textMine.set(node, value); });
      else textMine.set(node, value);
    };

    const doAttrs = (el: Element) => {
      if (skipped(el)) return;
      for (const a of ATTRS) {
        const current = el.getAttribute(a);
        if (current == null) continue;
        const mine = attrMine.get(el) ?? {};
        const origs = attrOrig.get(el) ?? {};
        if (mine[a] !== current) origs[a] = current;
        const orig = origs[a] ?? current;
        const value = translateValue(orig) ?? orig;
        if (value !== current) writes.push(() => { el.setAttribute(a, value); mine[a] = value; });
        else mine[a] = value;
        attrMine.set(el, mine); attrOrig.set(el, origs);
      }
    };

    const walk = (start: Node) => {
      if (start.nodeType === Node.TEXT_NODE) { doText(start as Text); return; }
      if (!(start instanceof Element)) return;
      doAttrs(start);
      const w = document.createTreeWalker(start, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) doText(n as Text); else doAttrs(n as Element);
      }
      schedule();
    };

    const flush = async () => {
      const batch = Array.from(pending).slice(0, 80);
      batch.forEach((t) => { pending.delete(t); inflight.add(t); });
      if (!batch.length) return;
      try {
        const result = await translateTexts({ data: { lang, texts: batch } });
        Object.entries(result).forEach(([k, v]) => dict.set(k, v));
        try { localStorage.setItem(CACHE_KEY(lang), JSON.stringify(Object.fromEntries(Array.from(dict).slice(-3000)))); } catch { /* full */ }
      } catch (e) { console.warn("translation", e); batch.forEach((t) => dict.set(t, t)); }
      batch.forEach((t) => inflight.delete(t));
      if (disposed) return;
      scan();
    };
    function schedule() { if (pending.size && !timer) timer = window.setTimeout(() => { timer = undefined; void flush(); }, 60); }

    async function commit() {
      if (committing || disposed || pending.size || inflight.size) return;
      committing = true;
      await document.fonts.load('16px "SolaimanLipi"');
      if (disposed) return;
      const apply = () => {
        if (disposed) return;
        document.documentElement.lang = lang;
        const ready = writes;
        writes = [];
        ready.forEach((write) => write());
      };
      const doc = document as Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };
      if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        try { await doc.startViewTransition(apply).finished; } catch { apply(); }
      } else apply();
      committing = false;
      if (!disposed) scan();
    }
    function scan() {
      if (disposed || committing || !root) return;
      writes = [];
      walk(root);
      if (!pending.size && !inflight.size && (writes.length || document.documentElement.lang !== lang)) void commit();
    }
    scan();

    const obs = new MutationObserver(() => scan());
    obs.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => {
      disposed = true; obs.disconnect(); window.clearTimeout(timer);
    };
  }, [lang, active, rootId]);

  return null;
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div translate="no" role="group" aria-label="Language / ভাষা" className={`lang-toggle notranslate relative inline-grid h-8 w-28 shrink-0 grid-cols-2 items-center rounded-full border border-primary/40 bg-background/40 p-0.5 text-xs font-bold ${className}`}>
      <span aria-hidden="true" className={`lang-toggle-indicator pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-primary ${lang === "en" ? "translate-x-full" : "translate-x-0"}`} />
      {(["bn", "en"] as const).map((l) => (
        <Button variant="ghost" key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`relative z-10 h-6 w-full min-w-0 cursor-pointer overflow-hidden rounded-full px-0 py-0 text-[11px] leading-none sm:text-xs font-bold hover:bg-transparent ${lang === l ? "text-primary-foreground hover:text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}>
          {l === "bn" ? "বাংলা" : "EN"}
        </Button>
      ))}
    </div>
  );
}

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { translateTexts } from "@/lib/translate.functions";

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
    document.documentElement.lang = lang;
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
    if (e.getAttribute("translate") === "no" || e.classList.contains("notranslate") || e.isContentEditable) return true;
  }
  return false;
}

function loadCache(l: Lang): Map<string, string> {
  try { return new Map(Object.entries(JSON.parse(localStorage.getItem(CACHE_KEY(l)) ?? "{}"))); } catch { return new Map(); }
}

export function PageTranslator({ rootId, active }: { rootId: string; active: boolean }) {
  const { lang } = useLang();
  const caches = useRef<Partial<Record<Lang, Map<string, string>>>>({});
  const [, force] = useState(0);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || !active) return;
    const dict = (caches.current[lang] ??= loadCache(lang));
    const textOrig = new WeakMap<Text, string>();
    const textMine = new WeakMap<Text, string>();
    const attrOrig = new WeakMap<Element, Record<string, string>>();
    const attrMine = new WeakMap<Element, Record<string, string>>();
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
      if (value !== current) node.nodeValue = value;
      textMine.set(node, value);
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
        if (value !== current) el.setAttribute(a, value);
        mine[a] = value; attrMine.set(el, mine); attrOrig.set(el, origs);
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
      if (!batch.length) { document.documentElement.classList.remove("i18n-loading"); return; }
      try {
        const result = await translateTexts({ data: { lang, texts: batch } });
        Object.entries(result).forEach(([k, v]) => dict.set(k, v));
        try { localStorage.setItem(CACHE_KEY(lang), JSON.stringify(Object.fromEntries(Array.from(dict).slice(-3000)))); } catch { /* full */ }
      } catch (e) { console.warn("translation", e); }
      batch.forEach((t) => inflight.delete(t));
      if (disposed) return;
      walk(root);
      if (pending.size) schedule(); else document.documentElement.classList.remove("i18n-loading");
    };
    function schedule() { if (pending.size && !timer) timer = window.setTimeout(() => { timer = undefined; void flush(); }, 60); }

    if (lang === "bn" && dict.size < 20) {
      document.documentElement.classList.add("i18n-loading");
      window.setTimeout(() => document.documentElement.classList.remove("i18n-loading"), 2500);
    }
    walk(root);
    if (!pending.size) document.documentElement.classList.remove("i18n-loading");

    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") doText(m.target as Text);
        else if (m.type === "attributes") doAttrs(m.target as Element);
        else m.addedNodes.forEach(walk);
      }
      schedule();
    });
    obs.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => {
      disposed = true; obs.disconnect(); window.clearTimeout(timer);
      document.documentElement.classList.remove("i18n-loading");
      // restore originals so the next language starts from source text
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) {
          const t = n as Text; const o = textOrig.get(t);
          if (o !== undefined && textMine.get(t) === t.nodeValue && o !== t.nodeValue) t.nodeValue = o;
        } else {
          const el = n as Element; const o = attrOrig.get(el); const mine = attrMine.get(el);
          if (o && mine) for (const a of Object.keys(o)) if (el.getAttribute(a) === mine[a]) el.setAttribute(a, o[a]);
        }
      }
      force((x) => x);
    };
  }, [lang, active, rootId]);

  return null;
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div translate="no" role="group" aria-label="Language / ভাষা" className={`lang-toggle notranslate inline-flex items-center rounded-full border border-primary/40 bg-background/40 p-0.5 text-xs font-bold ${className}`}>
      {(["bn", "en"] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`rounded-full px-3 py-1 transition-all ${lang === l ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.6)]" : "text-muted-foreground hover:text-primary"}`}>
          {l === "bn" ? "বাংলা" : "EN"}
        </button>
      ))}
    </div>
  );
}

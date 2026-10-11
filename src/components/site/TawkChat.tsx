import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

const TAWK_SRC = "https://embed.tawk.to/6ac93df8a0c07d34c6278e4e/1k4h1k58t";

type TawkApi = {
  hideWidget?: () => void; showWidget?: () => void; onLoad?: () => void;
  onChatMaximized?: () => void; onChatMinimized?: () => void; onChatHidden?: () => void;
};
declare global {
  interface Window { Tawk_API?: TawkApi; Tawk_LoadStart?: Date }
}

const lockPage = (on: boolean) => document.documentElement.classList.toggle("chat-open", on);

/** tawk.to live chat: loaded once after the page is idle, shown only on public pages. */
export function TawkChat({ visible }: { visible: boolean }) {
  useEffect(() => {
    if (!visible || document.getElementById("tawk-script")) return;
    const load = () => {
      if (document.getElementById("tawk-script")) return;
      const api: TawkApi = (window.Tawk_API = window.Tawk_API || {});
      // Stop the page behind the open chat from scrolling (all devices).
      api.onChatMaximized = () => lockPage(true);
      api.onChatMinimized = () => lockPage(false);
      api.onChatHidden = () => lockPage(false);
      window.Tawk_LoadStart = new Date();
      const s = document.createElement("script");
      s.id = "tawk-script";
      s.async = true;
      s.src = TAWK_SRC;
      s.charset = "UTF-8";
      document.body.appendChild(s);
    };
    // Load only after a real visitor interacts (scroll/tap/key). Speed-test bots never interact,
    // so tawk.to's bot-blocking 403 never hits the console and the page stays light.
    const events = ["pointerdown", "touchstart", "keydown", "scroll", "mousemove"] as const;
    const trigger = () => { events.forEach((e) => window.removeEventListener(e, trigger)); load(); };
    events.forEach((e) => window.addEventListener(e, trigger, { once: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, trigger));
  }, [visible]);

  useEffect(() => { if (!visible) lockPage(false); }, [visible]);

  // Tuck the chat button away while the footer credit line is on screen so the credit stays clickable;
  // it returns as soon as the visitor scrolls back up. Never hidden while a chat is open.
  const [creditInView, setCreditInView] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    setCreditInView(false);
    if (!visible) return;
    let io: IntersectionObserver | undefined;
    const t = window.setTimeout(() => {
      const el = document.querySelector(".footer-credit-link");
      if (!el) return;
      io = new IntersectionObserver(([e]) => setCreditInView(!!e?.isIntersecting), { rootMargin: "0px 0px 40px 0px" });
      io.observe(el);
    }, 300);
    return () => { window.clearTimeout(t); io?.disconnect(); };
  }, [visible, pathname]);

  const show = visible && !creditInView;
  useEffect(() => {
    const api = (window.Tawk_API = window.Tawk_API || {});
    const apply = () => {
      if (show) api.showWidget?.();
      else if (!document.documentElement.classList.contains("chat-open") || !visible) api.hideWidget?.();
    };
    if (api.hideWidget) apply();
    api.onLoad = apply;
  }, [show, visible]);

  return null;
}

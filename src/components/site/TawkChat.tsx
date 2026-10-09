import { useEffect } from "react";

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
      s.setAttribute("crossorigin", "*");
      document.body.appendChild(s);
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 4000 });
    else window.setTimeout(load, 2500);
  }, [visible]);

  useEffect(() => { if (!visible) lockPage(false); }, [visible]);

  useEffect(() => {
    const api = window.Tawk_API;
    if (!api) return;
    const apply = () => (visible ? api.showWidget?.() : api.hideWidget?.());
    if (api.hideWidget) apply();
    else api.onLoad = apply;
  }, [visible]);

  return null;
}

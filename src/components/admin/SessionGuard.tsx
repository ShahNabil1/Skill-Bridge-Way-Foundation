import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sessionHeartbeat } from "@/lib/users.functions";

export const ENDED_KEY = "sbf_session_ended";
const BEAT_MS = 60_000;

/** Records this session (device/IP/geo), active time and page views, and signs out instantly when an admin ends it. */
export function SessionGuard() {
  const beat = useServerFn(sessionHeartbeat);
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rowRef = useRef<string | null>(null);
  const lastBeat = useRef(Date.now());
  const ending = useRef(false);

  async function endWith(reason: string) {
    if (ending.current) return;
    ending.current = true;
    try { sessionStorage.setItem(ENDED_KEY, reason); } catch { /* storage blocked */ }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("/auth");
  }

  async function send(pageView: boolean) {
    const now = Date.now();
    const visible = document.visibilityState === "visible";
    const seconds = visible ? Math.min(120, Math.round((now - lastBeat.current) / 1000)) : 0;
    lastBeat.current = now;
    try {
      const r = await beat({ data: { page: pathname, seconds: pageView ? 0 : seconds, pageView } });
      if (r.sessionRow) rowRef.current = r.sessionRow;
      if (r.revoked) await endWith(r.revoked);
    } catch (e) {
      if (/Unauthorized/i.test((e as Error).message)) await endWith("expired");
    }
  }

  // page view on every navigation
  useEffect(() => { void send(true); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // heartbeat
  useEffect(() => {
    const t = window.setInterval(() => { void send(false); }, BEAT_MS);
    const onVis = () => { if (document.visibilityState === "visible") lastBeat.current = Date.now(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // realtime: own session rows
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      channel = supabase.channel(`my-sessions-${data.user.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_sessions", filter: `user_id=eq.${data.user.id}` }, (payload) => {
          const row = payload.new as { id: string; revoked_at: string | null; revoke_reason: string | null };
          if (row.revoked_at && (row.id === rowRef.current || ["banned", "deleted", "password_reset"].includes(row.revoke_reason ?? "") || !rowRef.current)) {
            void endWith(row.revoke_reason ?? "revoked");
          }
        })
        .subscribe();
    });
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

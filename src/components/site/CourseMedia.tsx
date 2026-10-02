import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { cdnUrl } from "@/lib/cdn";
import { applyState, descriptionHtml, youtubeId } from "@/lib/course-content";

export function RichContent({ html, className = "" }: { html?: string | null; className?: string }) {
  const h = descriptionHtml(html);
  if (!h) return <p className="text-muted-foreground">Full course details coming soon.</p>;
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: h }} />;
}

/** Main viewer with thumbnails: video first (if any), then images. */
export function CourseMedia({ images, video, title }: { images: string[]; video?: string | null; title: string }) {
  const vid = youtubeId(video);
  const items = [...(vid ? [{ type: "video" as const, id: vid }] : []), ...images.map((k) => ({ type: "image" as const, id: k }))];
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(false);
  if (!items.length) return null;
  const cur = items[Math.min(i, items.length - 1)]!;
  return <div className="mb-8 space-y-3">
    <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted">
      {cur.type === "video" ? (play
        ? <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${cur.id}?autoplay=1&rel=0`} title={`${title} video`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        : <button onClick={() => setPlay(true)} className="group relative h-full w-full" aria-label="Play video">
            <img src={`https://i.ytimg.com/vi/${cur.id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-background/30"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-highlight text-highlight-foreground shadow-xl transition group-hover:scale-110"><Play className="ml-1 h-7 w-7" fill="currentColor" /></span></span>
          </button>)
        : <img src={cdnUrl(cur.id)!} alt={title} className="h-full w-full object-cover" />}
    </div>
    {items.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((it, n) => <button key={it.id} onClick={() => { setI(n); setPlay(false); }} aria-label={it.type === "video" ? "Video" : `Image ${n + 1}`}
        className={`relative aspect-video w-24 shrink-0 overflow-hidden rounded-md border-2 transition ${n === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}>
        <img src={it.type === "video" ? `https://i.ytimg.com/vi/${it.id}/mqdefault.jpg` : cdnUrl(it.id)!} alt="" className="h-full w-full object-cover" />
        {it.type === "video" && <Play className="absolute inset-0 m-auto h-5 w-5 text-foreground" fill="currentColor" />}
      </button>)}
    </div>}
  </div>;
}

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function Countdown({ to, label }: { to: number; label: string }) {
  const now = useNow() ?? to;
  const d = Math.max(0, to - now);
  const parts = [["Days", Math.floor(d / 864e5)], ["Hours", Math.floor(d / 36e5) % 24], ["Min", Math.floor(d / 6e4) % 60], ["Sec", Math.floor(d / 1e3) % 60]] as const;
  return <div className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <div className="grid grid-cols-4 gap-2" role="timer" aria-live="off">
      {parts.map(([k, v]) => <div key={k} className="rounded-lg border border-primary/30 bg-primary/10 py-2 text-center"><p className="font-heading text-2xl font-extrabold tabular-nums text-primary">{String(v).padStart(2, "0")}</p><p className="text-[10px] uppercase text-muted-foreground">{k}</p></div>)}
    </div>
    <p className="text-xs text-muted-foreground">{new Date(to).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
  </div>;
}

/** Enroll gate: countdown before opening, live button + closing countdown while open, disabled after the end. */
export function EnrollGate({ start, end, children }: { start?: string | null; end?: string | null; children: React.ReactNode }) {
  const now = useNow();
  const st = applyState(start, end, now ?? Date.now());
  if (st.phase === "upcoming") return <div className="space-y-4"><Countdown to={st.target!} label="Applications open in" /><button disabled className="h-11 w-full cursor-not-allowed rounded-md bg-muted text-sm font-semibold text-muted-foreground">Enrollment opens soon</button></div>;
  if (st.phase === "closed") return <div className="space-y-2"><button disabled className="h-11 w-full cursor-not-allowed rounded-md bg-muted text-sm font-semibold text-muted-foreground">Enrollment closed</button><p className="text-xs text-muted-foreground">Applications for this intake have ended.</p></div>;
  return <div className="space-y-4">{children}{st.target && <Countdown to={st.target} label="Applications close in" />}</div>;
}

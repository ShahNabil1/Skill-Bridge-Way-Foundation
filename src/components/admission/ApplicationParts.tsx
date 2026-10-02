import { Download, Eye, FileText, UserRound } from "lucide-react";
import { cdnUrl } from "@/lib/cdn";
import { docLabel, docsOf, downloadFile, extOf, photoKey, refOf, type AppDoc, type ApplicationRecord } from "@/lib/application";
import { Button } from "@/components/ui/button";

export function ApplicantAvatar({ app, size = "h-28 w-28" }: { app: Pick<ApplicationRecord, "document_keys" | "full_name">; size?: string }) {
  const src = cdnUrl(photoKey(app));
  return <div className={`${size} shrink-0 overflow-hidden rounded-2xl border-2 border-primary/60 bg-muted shadow-[0_0_30px_-8px_var(--color-primary)]`}>
    {src ? <img src={src} alt={`${app.full_name} photo`} className="h-full w-full object-cover" /> : <UserRound className="m-auto h-full w-1/2 text-muted-foreground" />}
  </div>;
}

export function StatusBadge({ status }: { status: string }) {
  const cls = status === "approved" ? "bg-primary/15 text-primary border-primary/40" : status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/40" : "bg-highlight/15 text-highlight border-highlight/40";
  return <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${cls}`}>{status}</span>;
}

export function DocumentGrid({ app, onEvent }: { app: ApplicationRecord; onEvent?: (action: "viewed_document" | "downloaded_document", d: AppDoc) => void }) {
  const docs = docsOf(app);
  if (!docs.length) return <p className="text-sm text-muted-foreground">No documents uploaded.</p>;
  return <div className="grid gap-3 sm:grid-cols-3">
    {docs.map((d, i) => {
      const url = cdnUrl(d.key);
      if (!url) return null;
      const isImg = /\.(jpe?g|png|webp)$/i.test(d.key ?? "");
      return <div key={i} className="glass overflow-hidden rounded-xl transition hover:border-primary/60">
        <a href={url} target="_blank" rel="noreferrer" onClick={() => onEvent?.("viewed_document", d)} className="block">
          {isImg ? <img src={url} alt={docLabel(d.type)} loading="lazy" className="h-32 w-full object-cover" /> : <div className="flex h-32 items-center justify-center"><FileText className="h-10 w-10 text-primary" /></div>}
        </a>
        <div className="flex items-center justify-between gap-2 p-3">
          <p className="min-w-0 truncate text-sm">{docLabel(d.type)}</p>
          <div className="flex shrink-0 gap-1">
            <Button asChild size="icon" variant="ghost" className="h-8 w-8" aria-label="View"><a href={url} target="_blank" rel="noreferrer" onClick={() => onEvent?.("viewed_document", d)}><Eye className="h-4 w-4" /></a></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Download" onClick={() => { onEvent?.("downloaded_document", d); downloadFile(url, `${refOf(app.id)}-${d.type ?? "document"}.${extOf(d.key)}`); }}><Download className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>;
    })}
  </div>;
}

export function InfoGrid({ rows }: { rows: [string, string | null | undefined][] }) {
  return <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
    {rows.map(([k, v]) => <div key={k}><dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="mt-0.5 break-words">{v || "—"}</dd></div>)}
  </dl>;
}

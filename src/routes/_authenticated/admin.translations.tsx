import { confirmAction } from "@/components/ConfirmDialog";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RotateCcw, Save, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminOnly, PageTitle, selectCls } from "@/components/admin/shared";
import { seo } from "@/components/site/PageHero";

type Row = { id: string; source: string; lang: "bn" | "en"; translated: string; manual: boolean; updated_at: string };

export const Route = createFileRoute("/_authenticated/admin/translations")({ staticData: { sitemap: false },
  head: () => seo("Translations | Skill Bridgeway Foundation", "Private translation review.", { noindex: true }),
  component: () => <AdminOnly><TranslationsAdmin /></AdminOnly>,
});

function TranslationsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["admin-translations", lang, q],
    queryFn: async () => {
      let query = (supabase as any).from("site_translations").select("id, source, lang, translated, manual, updated_at").eq("lang", lang).order("updated_at", { ascending: false }).limit(200);
      if (q.trim()) query = query.or(`source.ilike.%${q.trim().replace(/[%,()]/g, "")}%,translated.ilike.%${q.trim().replace(/[%,()]/g, "")}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Row[];
    },
  });

  return (
    <div>
      <PageTitle title="Translations" />
      <p className="-mt-3 mb-5 max-w-3xl text-sm text-muted-foreground">The public site translates automatically between English and Bangla. Correct any wording here — your edit is used everywhere and is never overwritten.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search text…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={selectCls} value={lang} onChange={(e) => setLang(e.target.value as "bn" | "en")} aria-label="Translation direction">
          <option value="bn">English → বাংলা</option>
          <option value="en">বাংলা → English</option>
        </select>
      </div>
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : rows.length === 0 ? (
        <p className="text-muted-foreground">No translations yet. They appear here as visitors view pages in the other language.</p>
      ) : (
        <div className="space-y-3">{rows.map((r) => <TRow key={r.id} row={r} onChanged={() => qc.invalidateQueries({ queryKey: ["admin-translations"] })} />)}</div>
      )}
    </div>
  );
}

function TRow({ row, onChanged }: { row: Row; onChanged: () => void }) {
  const [value, setValue] = useState(row.translated);
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  async function save() {
    setBusy("save");
    const { error } = await (supabase as any).from("site_translations").update({ translated: value.trim(), manual: true, updated_at: new Date().toISOString() }).eq("id", row.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Translation saved"); onChanged();
  }
  async function reset() {
    if (!(await confirmAction({ title: "Re-translate automatically?", description: "This removes the current translation. A fresh automatic translation is created the next time a visitor sees this text.", confirmText: "Re-translate" }))) return;
    setBusy("reset");
    const { error } = await (supabase as any).from("site_translations").delete().eq("id", row.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Will be re-translated"); onChanged();
  }
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-2 whitespace-pre-wrap text-sm text-muted-foreground">{row.source}</p>
      <Textarea rows={Math.min(6, Math.max(1, Math.ceil(value.length / 90)))} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Translated text" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {row.manual && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">Edited by admin</span>}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={reset}>{busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Re-translate</Button>
          <Button size="sm" disabled={!!busy || !value.trim() || value === row.translated} onClick={save}>{busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button>
        </div>
      </div>
    </div>
  );
}

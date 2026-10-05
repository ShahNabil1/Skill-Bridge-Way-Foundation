import { confirmAction } from "@/components/ConfirmDialog";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminOnly, PageTitle, selectCls, useMediaUpload } from "@/components/admin/shared";
import { cdnUrl } from "@/lib/cdn";
import { IMAGE_TYPES } from "@/lib/r2.functions";
import { PARTNER_TIERS, PARTNER_TYPE_OPTIONS, tierLabel } from "@/lib/partners";
import { seo } from "@/components/site/PageHero";

type Partner = Tables<"partners">;
type Form = { id?: string; name: string; tier: string; partner_type: string; logo_key: string | null; website_url: string; description: string; is_published: boolean };
const empty: Form = { name: "", tier: "partner", partner_type: "", logo_key: null, website_url: "", description: "", is_published: true };

export const Route = createFileRoute("/_authenticated/admin/partners")({ staticData: { sitemap: false },
  head: () => seo("Manage Partners | Skill Bridgeway Foundation", "Private partner management.", { noindex: true }),
  component: () => <AdminOnly><PartnersAdmin /></AdminOnly>,
});

function PartnersAdmin() {
  const qc = useQueryClient();
  const upload = useMediaUpload();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-partners"] }); qc.invalidateQueries({ queryKey: ["partners"] }); };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return toast.error("Partner name is required");
    let url = form.website_url.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (url) { try { new URL(url); } catch { return toast.error("Enter a valid website link"); } }
    setSaving(true);
    const payload = { name: form.name.trim(), tier: form.tier, partner_type: form.partner_type || null, logo_key: form.logo_key, website_url: url || null, description: form.description.trim() || null, is_published: form.is_published };
    const res = form.id
      ? await supabase.from("partners").update(payload).eq("id", form.id)
      : await supabase.from("partners").insert({ ...payload, sort_order: rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0 });
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(form.id ? "Partner updated" : "Partner added");
    setForm(null); refresh();
  };

  const toggle = async (p: Partner) => {
    const { error } = await supabase.from("partners").update({ is_published: !p.is_published }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(p.is_published ? "Hidden from website" : "Now featured on website"); refresh();
  };
  const remove = async (p: Partner) => {
    if (!(await confirmAction({ title: `Remove ${p.name}?`, description: "This partner will be removed from the website permanently.", confirmText: "Remove", destructive: true }))) return;
    const { error } = await supabase.from("partners").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Partner removed"); refresh();
  };
  const move = async (i: number, dir: -1 | 1) => {
    const a = rows[i], b = rows[i + dir];
    if (!a || !b) return;
    const sa = a.sort_order === b.sort_order ? i : a.sort_order;
    const sb = a.sort_order === b.sort_order ? i + dir : b.sort_order;
    const r1 = await supabase.from("partners").update({ sort_order: sb }).eq("id", a.id);
    const r2 = await supabase.from("partners").update({ sort_order: sa }).eq("id", b.id);
    if (r1.error || r2.error) toast.error("Could not reorder");
    refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle title="Partners" />
        <Button onClick={() => setForm(empty)}><Plus className="mr-1 h-4 w-4" />Add partner</Button>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Featured partners appear on the home page and the Partner With Us page, grouped by tier. Hide a partner to remove it from the website without deleting it.</p>

      {error ? <p className="mt-6 text-sm text-destructive">Could not load partners.</p>
        : isLoading ? <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>
        : !rows.length ? <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No partners yet. Click “Add partner” to feature your first one.</div>
        : (
          <ul className="mt-6 divide-y rounded-xl border">
            {rows.map((p, i) => (
              <li key={p.id} className={`flex flex-wrap items-center gap-4 p-4 ${p.is_published ? "" : "opacity-60"}`}>
                <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/95 p-2">
                  {p.logo_key ? <img src={cdnUrl(p.logo_key) ?? ""} alt="" className="max-h-full max-w-full object-contain" /> : <ImagePlus className="h-5 w-5 text-background/60" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{tierLabel(p.tier)}{p.partner_type ? ` · ${p.partner_type}` : ""} · {p.is_published ? "Featured" : "Hidden"}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label={p.is_published ? "Hide" : "Feature"} onClick={() => toggle(p)}>{p.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setForm({ id: p.id, name: p.name, tier: p.tier, partner_type: p.partner_type ?? "", logo_key: p.logo_key, website_url: p.website_url ?? "", description: p.description ?? "", is_published: p.is_published })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}

      <Dialog open={!!form} onOpenChange={(o) => !o && !saving && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit partner" : "Add partner"}</DialogTitle>
            <DialogDescription>Logos look best as PNG with a transparent background.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-md bg-foreground/95 p-2">
                  {form.logo_key ? <img src={cdnUrl(form.logo_key) ?? ""} alt="" className="max-h-full max-w-full object-contain" /> : <ImagePlus className="h-6 w-6 text-background/60" />}
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <label className="cursor-pointer text-primary hover:underline">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : form.logo_key ? "Replace logo" : "Upload logo"}
                    <input type="file" accept={IMAGE_TYPES.join(",")} className="hidden" disabled={uploading} onChange={async (e) => {
                      const f = e.target.files?.[0]; e.target.value = "";
                      if (!f) return;
                      setUploading(true);
                      try { const key = await upload(f, "partners"); setForm((s) => s && { ...s, logo_key: key }); }
                      catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
                      finally { setUploading(false); }
                    }} />
                  </label>
                  {form.logo_key && <button type="button" className="text-left text-muted-foreground hover:text-destructive" onClick={() => setForm({ ...form, logo_key: null })}>Remove logo</button>}
                </div>
              </div>
              <div><Label htmlFor="p-name">Name *</Label><Input id="p-name" value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="p-tier">Tier</Label>
                  <select id="p-tier" className={selectCls} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                    {PARTNER_TIERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select></div>
                <div><Label htmlFor="p-type">Type</Label>
                  <select id="p-type" className={selectCls} value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })}>
                    <option value="">—</option>
                    {PARTNER_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select></div>
              </div>
              <div><Label htmlFor="p-url">Website</Label><Input id="p-url" placeholder="https://example.com" value={form.website_url} maxLength={300} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></div>
              <div><Label htmlFor="p-desc">Short description</Label><Textarea id="p-desc" rows={3} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />Feature on website</label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
                <Button onClick={save} disabled={saving || uploading}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

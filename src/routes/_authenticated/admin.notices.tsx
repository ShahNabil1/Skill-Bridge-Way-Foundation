import { confirmAction } from "@/components/ConfirmDialog";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminOnly, PageTitle, selectCls } from "@/components/admin/shared";
import { slugify } from "@/lib/cdn";
import { formatDate } from "@/lib/public-data";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/notices")({ staticData: { sitemap: false },
  head: () => seo("Manage Notices | Skill Bridgeway Foundation", "Private notices and events management.", { noindex: true }),
  component: () => <AdminOnly><NoticesAdmin /></AdminOnly>,
});

type Notice = Tables<"notices">;
const empty = { title: "", slug: "", body: "", type: "notice" as "notice" | "event", event_date: "", is_published: false };
const schema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,80}$/, "Slug: lowercase letters, numbers, dashes"),
  body: z.string().trim().max(10000),
  type: z.enum(["notice", "event"]),
  event_date: z.string(),
  is_published: z.boolean(),
});

function NoticesAdmin() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-notices"],
    queryFn: async () => (await supabase.from("notices").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [editing, setEditing] = useState<Notice | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-notices"] }); qc.invalidateQueries({ queryKey: ["notices"] }); };

  function edit(n: Notice | null) {
    setEditing(n);
    setForm(n ? { title: n.title, slug: n.slug, body: n.body ?? "", type: n.type, event_date: n.event_date ? n.event_date.slice(0, 16) : "", is_published: n.is_published } : empty);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) { toast.error(r.error.issues[0]?.message); return; }
    const payload = { ...r.data, body: r.data.body || null, event_date: r.data.event_date ? new Date(r.data.event_date).toISOString() : null };
    const { error } = editing ? await supabase.from("notices").update(payload).eq("id", editing.id) : await supabase.from("notices").insert(payload);
    if (error) { toast.error(error.message.includes("duplicate") ? "That slug is already used" : error.message); return; }
    toast.success("Saved"); setOpen(false); refresh();
  }

  async function remove(n: Notice) {
    if (!(await confirmAction({ title: `Delete "${n.title}"?`, description: "This notice will be permanently removed.", confirmText: "Delete", destructive: true }))) return;
    const { error } = await supabase.from("notices").delete().eq("id", n.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <>
      <PageTitle title="Notices & Events"><Button onClick={() => edit(null)}><Plus className="h-4 w-4" /> New</Button></PageTitle>
      <div className="glass overflow-x-auto rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Published</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nothing posted yet.</TableCell></TableRow>}
            {rows.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-medium text-foreground">{n.title}</TableCell>
                <TableCell><Badge variant={n.type === "event" ? "default" : "secondary"}>{n.type}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(n.event_date ?? n.created_at)}</TableCell>
                <TableCell><Switch checked={n.is_published} onCheckedChange={async () => { await supabase.from("notices").update({ is_published: !n.is_published }).eq("id", n.id); refresh(); }} /></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => edit(n)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(n)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New notice / event"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div className="space-y-2"><Label>Type</Label>
              <select className={selectCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "notice" | "event" })}>
                <option value="notice">Notice</option><option value="event">Event</option>
              </select></div>
            <div className="space-y-2"><Label>Event date (optional)</Label><Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
            <div className="flex items-center gap-2 pt-7"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><Label>Published</Label></div>
            <div className="space-y-2 sm:col-span-2"><Label>Details</Label><Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div className="sm:col-span-2"><Button type="submit">Save</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminOnly, ImageField, PageTitle } from "@/components/admin/shared";
import { cdnUrl, slugify } from "@/lib/cdn";

export const Route = createFileRoute("/_authenticated/admin/courses")({
  component: () => <AdminOnly><CoursesAdmin /></AdminOnly>,
});

type Course = Tables<"courses">;
const empty = { title: "", slug: "", summary: "", description: "", category: "", duration: "", level: "", cover_image_key: null as string | null, is_published: false, sort_order: 0 };
const schema = z.object({
  title: z.string().trim().min(3).max(150),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,80}$/, "Slug: lowercase letters, numbers, dashes"),
  summary: z.string().trim().max(300),
  description: z.string().trim().max(10000),
  category: z.string().trim().max(60),
  duration: z.string().trim().max(60),
  level: z.string().trim().max(60),
  cover_image_key: z.string().nullable(),
  is_published: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999),
});

function CoursesAdmin() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => (await supabase.from("courses").select("*").order("sort_order").order("created_at", { ascending: false })).data ?? [],
  });
  const [editing, setEditing] = useState<Course | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-courses"] }); qc.invalidateQueries({ queryKey: ["courses"] }); };

  function edit(c: Course | null) {
    setEditing(c);
    setForm(c ? { title: c.title, slug: c.slug, summary: c.summary ?? "", description: c.description ?? "", category: c.category ?? "", duration: c.duration ?? "", level: c.level ?? "", cover_image_key: c.cover_image_key, is_published: c.is_published, sort_order: c.sort_order } : empty);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0]?.message);
    const payload = { ...r.data, summary: r.data.summary || null, description: r.data.description || null, category: r.data.category || null, duration: r.data.duration || null, level: r.data.level || null };
    const { error } = editing ? await supabase.from("courses").update(payload).eq("id", editing.id) : await supabase.from("courses").insert(payload);
    if (error) return toast.error(error.message.includes("duplicate") ? "That slug is already used" : error.message);
    toast.success("Course saved"); setOpen(false); refresh();
  }

  async function remove(c: Course) {
    if (!confirm(`Delete "${c.title}"?`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function togglePublish(c: Course) {
    await supabase.from("courses").update({ is_published: !c.is_published }).eq("id", c.id);
    refresh();
  }

  const f = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageTitle title="Courses"><Button onClick={() => edit(null)}><Plus className="h-4 w-4" /> New course</Button></PageTitle>
      <div className="glass overflow-x-auto rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Category</TableHead><TableHead>Published</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground">No courses yet.</TableCell></TableRow>}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {c.cover_image_key && <img src={cdnUrl(c.cover_image_key)!} alt="" className="h-10 w-16 rounded object-cover" />}
                    <div><p className="font-medium text-foreground">{c.title}</p><p className="text-xs text-muted-foreground">/{c.slug}</p></div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.category ?? "—"}</TableCell>
                <TableCell><Switch checked={c.is_published} onCheckedChange={() => togglePublish(c)} /></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => edit(c)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit course" : "New course"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={f("slug")} /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={f("category")} placeholder="AI, Freelancing..." /></div>
            <div className="space-y-2"><Label>Duration</Label><Input value={form.duration} onChange={f("duration")} placeholder="3 months" /></div>
            <div className="space-y-2"><Label>Level</Label><Input value={form.level} onChange={f("level")} placeholder="Beginner" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Summary</Label><Textarea rows={2} value={form.summary} onChange={f("summary")} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea rows={6} value={form.description} onChange={f("description")} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Cover image</Label>
              <ImageField folder="courses" value={form.cover_image_key} onChange={(k) => setForm({ ...form, cover_image_key: k })} /></div>
            <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2 pt-7"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><Label>Published</Label></div>
            <div className="sm:col-span-2"><Button type="submit">Save course</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

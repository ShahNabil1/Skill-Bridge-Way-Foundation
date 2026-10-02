import { confirmAction } from "@/components/ConfirmDialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AdminOnly, PageTitle } from "@/components/admin/shared";
import { cdnUrl } from "@/lib/cdn";
import { formatDate } from "@/lib/public-data";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/notices")({ staticData: { sitemap: false },
  head: () => seo("Manage Notices | Skill Bridgeway Foundation", "Private notices and events management.", { noindex: true }),
  component: () => <AdminOnly><NoticesAdmin /></AdminOnly>,
});

type Notice = Tables<"notices">;

function NoticesAdmin() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["admin-notices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-notices"] });
    qc.invalidateQueries({ queryKey: ["notices"] });
    qc.invalidateQueries({ queryKey: ["notice"] });
  };
  async function toggle(n: Notice) {
    const { error } = await supabase.from("notices").update({ is_published: !n.is_published }).eq("id", n.id);
    if (error) toast.error(error.message); else refresh();
  }
  async function remove(n: Notice) {
    if (!(await confirmAction({ title: `Delete "${n.title}"?`, description: "This notice will be permanently removed.", confirmText: "Delete", destructive: true }))) return;
    const { error } = await supabase.from("notices").delete().eq("id", n.id);
    if (error) toast.error(error.message); else refresh();
  }

  return <>
    <PageTitle title="Notices & Events"><Button asChild><Link to="/admin/notices/$id" params={{ id: "new" }}><Plus className="h-4 w-4" />New notice</Link></Button></PageTitle>
    {error && <p role="alert" className="text-destructive">Could not load notices. Please try again.</p>}
    {isLoading ? <p className="text-muted-foreground">Loading...</p> : !error && rows.length === 0 ? <p className="py-8 text-muted-foreground">Nothing posted yet.</p> : (
      <div className="divide-y divide-border border-y border-border">
        {rows.map((n) => <div key={n.id} className="flex flex-wrap items-center gap-4 py-4">
          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">{n.cover_image_key && <img src={cdnUrl(n.cover_image_key) ?? ""} alt="" className="h-full w-full object-cover" />}</div>
          <div className="min-w-0 flex-1"><p className="font-semibold text-foreground">{n.title}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant={n.type === "event" ? "default" : "secondary"}>{n.type}</Badge>{formatDate(n.event_date ?? n.created_at)} · /notices/{n.slug}</p></div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">Published <Switch aria-label={`Publish ${n.title}`} checked={n.is_published} onCheckedChange={() => toggle(n)} /></label>
          <Button asChild size="icon" variant="ghost" aria-label={`Edit ${n.title}`}><Link to="/admin/notices/$id" params={{ id: n.id }}><Pencil className="h-4 w-4" /></Link></Button>
          <Button size="icon" variant="ghost" onClick={() => remove(n)} aria-label={`Delete ${n.title}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>)}
      </div>
    )}
  </>;
}
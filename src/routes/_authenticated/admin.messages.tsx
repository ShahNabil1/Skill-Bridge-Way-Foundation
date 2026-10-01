import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminOnly, PageTitle } from "@/components/admin/shared";
import { formatDate } from "@/lib/public-data";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: () => <AdminOnly><MessagesAdmin /></AdminOnly>,
});

function MessagesAdmin() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => (await supabase.from("contact_messages").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-messages"] });

  async function open(id: string, isRead: boolean) {
    setOpenId(openId === id ? null : id);
    if (!isRead) { await supabase.from("contact_messages").update({ is_read: true }).eq("id", id); refresh(); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <>
      <PageTitle title="Contact Messages" />
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : rows.length === 0 ? <p className="text-muted-foreground">No messages yet.</p> : (
        <div className="space-y-3">
          {rows.map((m) => (
            <div key={m.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => open(m.id, m.is_read)}>
                  <div className="flex flex-wrap items-center gap-2">
                    {!m.is_read && <Badge>New</Badge>}
                    <span className="font-medium text-foreground">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(m.created_at)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{m.subject || m.message}</p>
                </button>
                <Button size="icon" variant="ghost" onClick={() => remove(m.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              {openId === m.id && (
                <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  <p className="text-muted-foreground">Email: <a className="text-primary hover:underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone && <> · Phone: <a className="text-primary hover:underline" href={`tel:${m.phone}`}>{m.phone}</a></>}</p>
                  {m.subject && <p className="font-medium text-foreground">{m.subject}</p>}
                  <p className="whitespace-pre-wrap text-foreground/90">{m.message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

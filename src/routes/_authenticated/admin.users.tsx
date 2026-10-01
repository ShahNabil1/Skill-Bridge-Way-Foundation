import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminOnly, PageTitle, useCurrentUser } from "@/components/admin/shared";
import { inviteUser, listUsers } from "@/lib/admin.functions";
import { formatDate } from "@/lib/public-data";

export const Route = createFileRoute("/_authenticated/admin/users")({ staticData: { sitemap: false },
  component: () => <AdminOnly><UsersAdmin /></AdminOnly>,
});

function UsersAdmin() {
  const me = useCurrentUser();
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const invite = useServerFn(inviteUser);
  const { data: users = [], isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await invite({ data: { email, full_name: name, makeAdmin } });
      toast.success(`Invitation sent to ${email}`);
      setEmail(""); setName(""); setMakeAdmin(false);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  }

  async function toggleAdmin(userId: string, isAdmin: boolean) {
    const { error } = isAdmin
      ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin")
      : await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <>
      <PageTitle title="Users" />
      <form onSubmit={onInvite} className="glass mb-6 grid gap-4 rounded-xl p-5 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <div className="space-y-2"><Label>Full name</Label><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Email</Label><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="flex items-center gap-2 pb-2"><Switch checked={makeAdmin} onCheckedChange={setMakeAdmin} /><Label>Admin</Label></div>
        <Button type="submit" disabled={busy}><UserPlus className="h-4 w-4" /> {busy ? "Sending..." : "Invite"}</Button>
      </form>
      <div className="glass overflow-x-auto rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Joined</TableHead><TableHead>Last sign-in</TableHead><TableHead>Admin</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-muted-foreground">Loading...</TableCell></TableRow>}
            {error && <TableRow><TableCell colSpan={4} className="text-destructive">{(error as Error).message}</TableCell></TableRow>}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="text-foreground">
                  {u.email} {u.isSuper && <Badge className="ml-2">Super Admin</Badge>} {u.invited && <Badge variant="secondary" className="ml-2">Invited</Badge>}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                <TableCell className="text-muted-foreground">{u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "—"}</TableCell>
                <TableCell><Switch checked={u.isAdmin} disabled={u.isSuper || u.id === me.id} onCheckedChange={() => toggleAdmin(u.id, u.isAdmin)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

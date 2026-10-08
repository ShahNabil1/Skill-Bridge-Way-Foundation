import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Search, Settings2, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageTitle, usePermissions, selectCls } from "@/components/admin/shared";
import { inviteUser, listUsers } from "@/lib/users.functions";
import { PRESETS, ALL_PERMISSIONS } from "@/lib/permissions";
import { formatDate } from "@/lib/public-data";
import { cdnUrl } from "@/lib/cdn";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/users/")({ staticData: { sitemap: false },
  head: () => seo("Manage Users | Skill Bridgeway Foundation", "Private user management.", { noindex: true }),
  component: UsersAdmin,
});

function UsersAdmin() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const fetchUsers = useServerFn(listUsers);
  const invite = useServerFn(inviteUser);
  const { data: users = [], isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [preset, setPreset] = useState("none");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const list = useMemo(() => users.filter((u) => {
    const st = u.banned ? "banned" : u.invited ? "invited" : "active";
    return (status === "all" || st === status) && (`${u.email} ${u.full_name}`).toLowerCase().includes(q.toLowerCase());
  }), [users, q, status]);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const perms = can("users.permissions") ? PRESETS.find((p) => p.key === preset)?.perms ?? [] : [];
      await invite({ data: { email, full_name: name, permissions: perms } });
      toast.success(`Invitation sent to ${email}`);
      setEmail(""); setName(""); setPreset("none");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  }

  return (
    <>
      <PageTitle title="Users" />
      {can("users.invite") && (
        <form onSubmit={onInvite} className="glass mb-6 grid gap-4 rounded-xl p-5 md:grid-cols-[1fr_1fr_14rem_auto] md:items-end">
          <div className="space-y-2"><Label htmlFor="inv-name">Full name</Label><Input id="inv-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="inv-email">Email</Label><Input id="inv-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {can("users.permissions") && <div className="space-y-2"><Label htmlFor="inv-role">Starting access</Label>
            <select id="inv-role" className={selectCls} value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select></div>}
          <Button type="submit" disabled={busy} className="cta-shine">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} {busy ? "Sending..." : "Invite"}</Button>
        </form>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search users" placeholder="Search name or email" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select aria-label="Filter by status" className={`${selectCls} sm:w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option><option value="active">Active</option><option value="invited">Invited</option><option value="banned">Banned</option>
        </select>
      </div>
      <div className="glass overflow-x-auto rounded-xl">
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Status</TableHead><TableHead>Access</TableHead><TableHead>Joined</TableHead><TableHead>Last sign-in</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Loading...</TableCell></TableRow>}
            {error && <TableRow><TableCell colSpan={6} className="text-destructive">{(error as Error).message}</TableCell></TableRow>}
            {!isLoading && !list.length && !error && <TableRow><TableCell colSpan={6} className="text-muted-foreground">No users match.</TableCell></TableRow>}
            {list.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {u.avatar_key ? <img src={cdnUrl(u.avatar_key)!} alt="" className="h-full w-full object-cover" /> : (u.full_name || u.email)[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{u.full_name || "—"} {u.isSuper && <Badge className="ml-1 gap-1"><ShieldCheck className="h-3 w-3" />Super Admin</Badge>}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{u.banned ? <Badge variant="destructive">Banned</Badge> : u.invited ? <Badge variant="secondary">Invited</Badge> : <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Active</Badge>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.isSuper || u.permissionCount === ALL_PERMISSIONS.length ? "Full access" : u.permissionCount ? `${u.permissionCount} permissions` : "No access"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                <TableCell className="text-muted-foreground">{u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "—"}</TableCell>
                <TableCell className="text-right">
                  {can("users.manage") && <Button asChild size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10">
                    <Link to="/admin/users/$id" params={{ id: u.id }}><Settings2 className="h-4 w-4" />Manage</Link>
                  </Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

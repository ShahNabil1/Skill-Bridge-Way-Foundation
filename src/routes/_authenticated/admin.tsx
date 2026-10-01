import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => seo("Admin Dashboard | Skill Bridgeway Foundation", "Manage courses, admissions, notices and certificates."),
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="section-title text-3xl">Admin Dashboard</h1>
        <Button variant="outline" onClick={signOut}>Sign out</Button>
      </div>
      <div className="glass mt-8 rounded-xl p-8 text-muted-foreground">
        {isLoading ? "Checking access..." : isAdmin
          ? "Welcome, admin. Management tools arrive in Phase 4."
          : "Your account does not have admin access yet."}
      </div>
    </div>
  );
}

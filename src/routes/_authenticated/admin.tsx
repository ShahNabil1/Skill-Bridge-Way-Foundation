import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Bell, Image, Mail, ClipboardList, Users, UserCircle, LayoutDashboard, LogOut, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { seo } from "@/components/site/PageHero";
import { useIsAdmin } from "@/components/admin/shared";

export const Route = createFileRoute("/_authenticated/admin")({ staticData: { sitemap: false },
  head: () => seo("Admin Dashboard | Skill Bridgeway Foundation", "Manage courses, admissions, notices, gallery and users.", { noindex: true }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, admin: true, exact: true },
  { to: "/admin/admissions", label: "Admissions", icon: ClipboardList, admin: true },
  { to: "/admin/students", label: "Students", icon: GraduationCap, admin: true },
  { to: "/admin/courses", label: "Courses", icon: BookOpen, admin: true },
  { to: "/admin/notices", label: "Notices", icon: Bell, admin: true },
  { to: "/admin/gallery", label: "Gallery", icon: Image, admin: true },
  { to: "/admin/messages", label: "Messages", icon: Mail, admin: true },
  { to: "/admin/users", label: "Users", icon: Users, admin: true },
  { to: "/admin/profile", label: "My Profile", icon: UserCircle, admin: false },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isAdmin } = useIsAdmin();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[220px_1fr]">
      <aside className="glass h-fit rounded-xl p-3">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.filter((n) => !n.admin || isAdmin).map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-primary/15 !text-primary" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
          <Button variant="ghost" size="sm" className="shrink-0 justify-start gap-2 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </nav>
      </aside>
      <main className="min-w-0"><Outlet /></main>
    </div>
  );
}

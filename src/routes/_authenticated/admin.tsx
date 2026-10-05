import { confirmAction } from "@/components/ConfirmDialog";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BookOpen, Bell, Image, ClipboardList, Users, UserCircle, Handshake, LayoutDashboard, LogOut, GraduationCap, CalendarCheck, Menu, X } from "lucide-react";
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
  { to: "/admin/applications", label: "Applications", icon: ClipboardList, admin: true },
  { to: "/admin/students", label: "Students", icon: GraduationCap, admin: true },
  { to: "/admin/attendance", label: "Attendance", icon: CalendarCheck, admin: true },
  { to: "/admin/courses", label: "Courses", icon: BookOpen, admin: true },
  { to: "/admin/notices", label: "Notices", icon: Bell, admin: true },
  { to: "/admin/gallery", label: "Gallery", icon: Image, admin: true },
  { to: "/admin/partners", label: "Partners", icon: Handshake, admin: true },
  { to: "/admin/users", label: "Users", icon: Users, admin: true },
  { to: "/admin/profile", label: "My Profile", icon: UserCircle, admin: false },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const previous = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const currentPadding = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    return () => {
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      document.body.style.paddingRight = previous.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  async function signOut() {
    if (!(await confirmAction({ title: "Sign out?", description: "You will need to sign in again to access the admin panel.", confirmText: "Sign out", destructive: true }))) return;
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-grid">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background px-4 md:px-8">
        <Button variant="ghost" size="icon" aria-label={open ? "Close admin menu" : "Open admin menu"} aria-expanded={open} aria-controls="admin-menu" onClick={() => setOpen((value) => !value)}>
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
        <Link to="/admin" className="font-heading text-sm font-extrabold uppercase text-foreground">Skill Bridgeway <span className="text-primary">/ Admin</span></Link>
      </header>
      <div className={`fixed inset-0 top-16 z-40 bg-background/70 transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside id="admin-menu" aria-label="Admin menu" inert={!open} className={`fixed inset-y-0 left-0 top-16 z-50 w-[min(19rem,85vw)] overflow-y-auto overscroll-contain border-r border-border bg-sidebar p-4 shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <nav className="flex flex-col gap-1">
          {NAV.filter((n) => !n.admin || isAdmin).map((n) => (
            <Link key={n.to} to={n.to} preload="intent" onClick={() => setOpen(false)} activeOptions={{ exact: "exact" in n }}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-primary/15 !text-primary" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
          <Button variant="ghost" className="min-h-11 justify-start gap-3 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 md:px-8"><Outlet /></main>
    </div>
  );
}

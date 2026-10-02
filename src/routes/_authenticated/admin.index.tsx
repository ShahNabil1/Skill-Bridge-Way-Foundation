import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly, PageTitle } from "@/components/admin/shared";
import { seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/_authenticated/admin/")({ staticData: { sitemap: false },
  head: () => seo("Admin Overview | Skill Bridgeway Foundation", "Private administrative overview.", { noindex: true }),
  component: () => <AdminOnly><Overview /></AdminOnly>,
});

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const count = async (t: "admissions" | "courses" | "students", f?: (q: any) => any) => {
        let q = supabase.from(t).select("id", { count: "exact", head: true });
        if (f) q = f(q);
        return (await q).count ?? 0;
      };
      const [pending, courses, students] = await Promise.all([
        count("admissions", (q) => q.eq("status", "pending")),
        count("courses"),
        count("students"),
      ]);
      return { pending, courses, students };
    },
  });
  const cards = [
    { label: "Pending admissions", value: data?.pending, to: "/admin/applications" },
    { label: "Students", value: data?.students, to: "/admin/students" },
    { label: "Courses", value: data?.courses, to: "/admin/courses" },
  ] as const;
  return (
    <>
      <PageTitle title="Overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="glass rounded-xl p-5 transition hover:border-primary/50">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-heading text-3xl font-extrabold text-foreground">{c.value ?? "—"}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

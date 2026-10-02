import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/admissions")({ staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({ to: "/admin/applications", replace: true }); },
});

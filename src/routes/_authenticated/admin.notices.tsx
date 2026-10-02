import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/notices")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
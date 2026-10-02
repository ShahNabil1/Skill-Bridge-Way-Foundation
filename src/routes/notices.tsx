import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/notices")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
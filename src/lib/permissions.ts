// Single source of truth for admin permissions (must match public.all_permission_keys()).
export type PermGroup = { key: string; label: string; page?: string; perms: { key: string; label: string }[] };

export const PERMISSION_GROUPS: PermGroup[] = [
  { key: "dashboard", label: "Overview", page: "/admin", perms: [{ key: "dashboard.view", label: "View overview" }] },
  { key: "applications", label: "Applications", page: "/admin/applications", perms: [
    { key: "applications.view", label: "View applications" },
    { key: "applications.edit", label: "Edit application details" },
    { key: "applications.decide", label: "Approve / reject" },
    { key: "applications.documents", label: "View & download documents" },
    { key: "applications.delete", label: "Delete applications" },
  ] },
  { key: "students", label: "Students & Attendance", page: "/admin/students", perms: [
    { key: "students.view", label: "View students" },
    { key: "students.personal", label: "View personal details" },
    { key: "students.edit", label: "Edit students, batches & progress" },
    { key: "students.attendance", label: "Take attendance" },
    { key: "students.reminders", label: "Send emails & reminders" },
  ] },
  { key: "certificates", label: "Certificates", perms: [
    { key: "certificates.generate", label: "Generate certificates" },
    { key: "certificates.revoke", label: "Revoke certificates" },
    { key: "certificates.update_all", label: "Update all certificates" },
  ] },
  ...(["courses", "notices", "partners"] as const).map((k) => ({
    key: k, label: k[0]!.toUpperCase() + k.slice(1), page: `/admin/${k}`,
    perms: [
      { key: `${k}.view`, label: "View" }, { key: `${k}.create`, label: "Create" }, { key: `${k}.edit`, label: "Edit" },
      { key: `${k}.publish`, label: "Publish / unpublish" }, { key: `${k}.delete`, label: "Delete" },
    ],
  })),
  { key: "gallery", label: "Gallery", page: "/admin/gallery", perms: [
    { key: "gallery.view", label: "View" }, { key: "gallery.create", label: "Upload" }, { key: "gallery.edit", label: "Edit" }, { key: "gallery.delete", label: "Delete" },
  ] },
  { key: "translations", label: "Translations", page: "/admin/translations", perms: [
    { key: "translations.view", label: "View" }, { key: "translations.edit", label: "Correct translations" }, { key: "translations.delete", label: "Delete / re-translate" },
  ] },
  { key: "users", label: "Users", page: "/admin/users", perms: [
    { key: "users.view", label: "View user list" },
    { key: "users.invite", label: "Invite / create users" },
    { key: "users.manage", label: "Open Manage page" },
    { key: "users.personal", label: "View personal details" },
    { key: "users.edit", label: "Edit user info" },
    { key: "users.reset_password", label: "Reset passwords" },
    { key: "users.sessions", label: "View & end sessions" },
    { key: "users.activity", label: "View activity reports" },
    { key: "users.ban", label: "Ban / unban" },
    { key: "users.delete", label: "Delete accounts" },
    { key: "users.permissions", label: "Change permissions" },
  ] },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key));

/** Admin path prefix → permission needed to open it. */
export const PAGE_PERMISSION: [string, string][] = [
  ["/admin/applications", "applications.view"], ["/admin/admissions", "applications.view"],
  ["/admin/students", "students.view"], ["/admin/attendance", "students.attendance"],
  ["/admin/courses", "courses.view"], ["/admin/notices", "notices.view"], ["/admin/gallery", "gallery.view"],
  ["/admin/partners", "partners.view"], ["/admin/translations", "translations.view"], ["/admin/users", "users.view"],
];
export function permissionForPath(path: string): string | null {
  if (path === "/admin" || path === "/admin/") return "dashboard.view";
  return PAGE_PERMISSION.find(([p]) => path === p || path.startsWith(p + "/"))?.[1] ?? null;
}

const pick = (groups: string[], only?: (k: string) => boolean) =>
  PERMISSION_GROUPS.filter((g) => groups.includes(g.key)).flatMap((g) => g.perms.map((p) => p.key)).filter((k) => !only || only(k));

export const PRESETS: { key: string; label: string; description: string; perms: string[] }[] = [
  { key: "full", label: "Full admin", description: "Everything, including users and permissions", perms: ALL_PERMISSIONS },
  { key: "editor", label: "Content editor", description: "Courses, notices, gallery, partners, translations",
    perms: ["dashboard.view", ...pick(["courses", "notices", "gallery", "partners", "translations"])] },
  { key: "admissions", label: "Admissions officer", description: "Applications, students, attendance, certificates",
    perms: ["dashboard.view", ...pick(["applications", "students"]), "certificates.generate"] },
  { key: "none", label: "No access", description: "Signs in but sees nothing", perms: [] },
];

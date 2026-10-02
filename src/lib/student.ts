export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export const WEEKDAY_LABEL: Record<string, string> = { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };
export const LEARNING_STATUSES = ["active", "paused", "dropped", "completed"] as const;
export const ATTENDANCE = ["present", "late", "absent", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE)[number];

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const weekdayOf = (iso: string) => WEEKDAYS[new Date(`${iso}T00:00:00`).getDay()];

export type AttRow = { status: string; class_sessions: { session_date: string } | null };

/** Attendance summary for one enrollment. Late counts as attended. */
export function attendanceStats(rows: AttRow[]) {
  const sorted = [...rows].sort((a, b) => (b.class_sessions?.session_date ?? "").localeCompare(a.class_sessions?.session_date ?? ""));
  const held = sorted.filter((r) => r.status !== "excused").length;
  const attended = sorted.filter((r) => r.status === "present" || r.status === "late").length;
  const missed = sorted.filter((r) => r.status === "absent").length;
  let streak = 0;
  for (const r of sorted) { if (r.status === "absent") streak++; else if (r.status !== "excused") break; }
  return { held, attended, missed, streak, rate: held ? Math.round((attended / held) * 100) : null };
}

export const learningBadge = (s: string) =>
  s === "completed" ? "bg-primary/15 text-primary border-primary/40"
  : s === "dropped" ? "bg-destructive/15 text-destructive border-destructive/40"
  : s === "paused" ? "bg-muted text-muted-foreground border-border"
  : "bg-highlight/15 text-highlight border-highlight/40";

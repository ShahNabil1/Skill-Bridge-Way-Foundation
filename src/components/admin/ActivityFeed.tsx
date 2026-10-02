import { useInfiniteQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const FIRST = 10;
const MORE = 20;

export type ActivityRow = { id: string; actor_name: string | null; action: string; detail: unknown; note?: string | null; created_at: string };

/** Paginated activity log: loads the latest 10, then 20 more per "See more" click. */
export function ActivityFeed({ table, column, id, queryKey, render }: {
  table: "admission_activity" | "student_activity";
  column: "admission_id" | "student_id";
  id: string;
  queryKey: unknown[];
  render: (row: ActivityRow) => React.ReactNode;
}) {
  const q = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const size = pageParam === 0 ? FIRST : MORE;
      const { data, error } = await (supabase.from(table) as any).select("*").eq(column, id).order("created_at", { ascending: false }).range(pageParam, pageParam + size - 1);
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
    getNextPageParam: (last, all) => (last.length === (all.length === 1 ? FIRST : MORE) ? all.reduce((n, p) => n + p.length, 0) : undefined),
  });
  const rows = q.data?.pages.flat() ?? [];
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading activity...</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <div className="space-y-4">
      <ol className="relative space-y-4 border-l border-border pl-5">
        {rows.map((a) => <li key={a.id} className="relative">
          <span className="absolute -left-[25px] top-1 flex h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
          {render(a)}
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><History className="h-3 w-3" />{new Date(a.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
        </li>)}
      </ol>
      {q.hasNextPage && <Button variant="outline" size="sm" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>{q.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}See more</Button>}
    </div>
  );
}

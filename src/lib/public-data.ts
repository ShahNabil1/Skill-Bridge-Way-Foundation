import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Resolve a stored media key to a URL. Full URLs pass through; R2 keys get wired in Phase 3. */
export function mediaUrl(key?: string | null) {
  if (!key) return null;
  if (/^https?:\/\//.test(key) || key.startsWith("/")) return key;
  const base = import.meta.env["VITE_R2_PUBLIC_URL"] as string | undefined;
  return base ? `${base.replace(/\/$/, "")}/${key}` : null;
}

export const coursesQuery = (limit?: number) =>
  queryOptions({
    queryKey: ["courses", limit ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("courses")
        .select("id,title,slug,summary,category,duration,level,cover_image_key")
        .eq("is_published", true)
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const courseQuery = (slug: string) =>
  queryOptions({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const noticesQuery = (limit?: number) =>
  queryOptions({
    queryKey: ["notices", limit ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("notices")
        .select("id,title,slug,body,type,event_date,created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const galleryQuery = () =>
  queryOptions({
    queryKey: ["gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("id,title,image_key,category")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

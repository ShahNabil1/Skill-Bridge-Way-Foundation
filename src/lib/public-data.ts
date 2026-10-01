import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cdnUrl } from "@/lib/cdn";

/** Only this clearly labeled preview course accepts test applications. */
export const TEST_ENROLLMENT_SLUG = "demo-ai-literacy-productivity";
export const isPreviewOnlyCourse = (slug: string) => slug.startsWith("demo-") && slug !== TEST_ENROLLMENT_SLUG;

/** Resolve a stored media key to its CDN URL. */
export function mediaUrl(key?: string | null) {
  return cdnUrl(key);
}

export const coursesQuery = (limit?: number) =>
  queryOptions({
    queryKey: ["courses", limit ?? "all"],
    staleTime: 60_000,
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
    staleTime: 60_000,
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
    staleTime: 60_000,
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
    staleTime: 60_000,
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

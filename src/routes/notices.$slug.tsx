import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Megaphone } from "lucide-react";
import { NoticeContent } from "@/components/site/NoticeContent";
import { EmptyState } from "@/components/site/ui-bits";
import { seo } from "@/components/site/PageHero";
import { cdnUrl } from "@/lib/cdn";
import { plainText } from "@/lib/course-content";
import { formatDate, noticeQuery } from "@/lib/public-data";

export const Route = createFileRoute("/notices/$slug")({ staticData: { sitemap: true },
  loader: async ({ context, params }) => {
    try { return await context.queryClient.ensureQueryData(noticeQuery(params.slug)); }
    catch { return null; }
  },
  head: ({ params, loaderData: notice }) => {
    const title = notice?.title ?? "Notice unavailable";
    const desc = (notice?.summary || plainText(notice?.body) || "Read notices and events from Skill Bridgeway Foundation.").slice(0, 160);
    return seo(`${title} | Skill Bridgeway Foundation`, desc, { path: `/notices/${params.slug}`, type: "article", image: cdnUrl(notice?.cover_image_key), noindex: !notice });
  },
  component: NoticeDetail,
});

function NoticeDetail() {
  const notice = Route.useLoaderData();
  if (!notice) return <div className="mx-auto max-w-4xl px-4 py-16"><EmptyState>This notice could not be found. <Link to="/notices" className="text-primary hover:underline">Browse all notices</Link></EmptyState></div>;
  const Icon = notice.type === "event" ? CalendarDays : Megaphone;
  return <>
    <section className="page-intro border-b bg-grid"><div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
      <Link to="/notices" className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />All notices & events</Link>
      <p className="editorial-kicker mt-7"><Icon className="h-4 w-4" />{notice.type} · {formatDate(notice.event_date ?? notice.created_at)}</p>
      <h1 className="section-title mt-3 text-3xl leading-tight md:text-5xl">{notice.title}</h1>
      {notice.summary && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{notice.summary}</p>}
    </div></section>
    <article className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      {notice.cover_image_key && <img src={cdnUrl(notice.cover_image_key) ?? ""} alt={notice.title} className="mb-10 aspect-video w-full rounded-md object-cover" />}
      <NoticeContent body={notice.body} />
      <div className="mt-12 border-t border-border pt-6"><Link to="/notices" className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to all notices</Link></div>
    </article>
  </>;
}
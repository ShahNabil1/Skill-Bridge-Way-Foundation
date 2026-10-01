import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHero, seo } from "@/components/site/PageHero";

export const Route = createFileRoute("/courses/$slug")({
  head: () => seo("Course Details | Skill Bridgeway Foundation", "Course details, curriculum and admission information."),
  component: CourseDetails,
});

function CourseDetails() {
  const { slug } = Route.useParams();
  return (
    <>
      <PageHero eyebrow="Course" title={slug.replace(/-/g, " ")} />
      <ComingSoon phase="Phase 2" />
    </>
  );
}

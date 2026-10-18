<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Admission and media uploads use short-lived R2 PUT URLs from `r2.functions.ts`; media needs auth and non-avatar folders need admin; why: files bypass app servers and keys remain private.
- Admission approval runs in the `approve_admission` DB function; why: student record + ID + enrollment are created atomically and admin-checked in SQL.
- Accounts are invite-only (admin `inviteUser` server fn); the Super Admin email is enforced in DB triggers; why: no public sign-up, and the owner's admin role can't be removed.
- Certificates: DB `issue_certificate` creates the serial atomically; the PDF is generated in the admin browser (`src/lib/certificate-pdf.ts`) and uploaded straight to R2 under `certificates/`; why: no PDF rendering on the edge worker, and serials stay unique.
- Student emails send via Resend from server functions in `src/lib/email.functions.ts` (templates in `email.server.ts`); recipients are always read from the database, never from the caller; why: the public form can't be abused to email arbitrary addresses.
- Page SEO goes through `seo()` in `PageHero.tsx` (canonical, og:url, optional og:image, noindex); the sitemap is router-derived via `staticData.sitemap` on every route plus published courses; why: one place for head tags and a sitemap that tracks routes automatically.
- Public site chrome is rendered only for public routes; admin navigation uses a fixed overlay drawer, not a content-shifting sidebar; why: auth/admin need a focused interface at every screen size.
- Route links preload on intent and public query data stays fresh briefly; why: repeat navigation avoids unnecessary network work while admin data remains independently refreshed.
- Supabase/R2 holds demo content; only allowlisted AI Literacy accepts test applications; why: other demos cannot enroll.
- Applicants view their own application via a random `access_token` link served by `get_application_by_token`; application PDFs are generated in the browser (`src/lib/application-pdf.ts`) from live data; why: there is no public read access to the table, and the PDF always reflects edits.
- Admission applications are saved only through the `submitAdmission` server function after server-side Turnstile verification, and `/admission` requires a `course` search param (otherwise it redirects to /courses); why: bots can't flood the form, and applicants always choose a course first.
- The public pathway's sequence lives in `program-pathway.ts`; course details and admission stay in CMS records; why: a coherent journey preserves application history.
- Course images use `image_keys` (1–5; first is cover), cropped 16:9; apply windows are DB-enforced; why: legacy cards work and closed intakes can't be bypassed.
- Social profiles use `SocialLinks`; visible wordmarks use `BrandName`; why: shared brand data and styling stay consistent.
- Organization and office location JSON-LD use the structured postal addresses in `site-info.ts`; why: shared verified address data avoids divergent or invented postal details.
- Public translations use cached AI results with admin corrections; retain source text and commit batches atomically under a reduced-motion-aware crossfade with preloaded local Unicode fonts; skip translate="no"; why: avoids staggered reflow and preserves English styling.
- Admin access is granular: keys live in `src/lib/permissions.ts` and must match DB `all_permission_keys()`; RLS/DB functions check `has_permission(uid, key)`, and the `admin` role row only marks admin-panel access (kept in sync by `setUserPermissions`); why: per-action access is enforced in the database, not just hidden in the UI.
- Session geo comes from the Cloudflare `request.cf` object on the published worker with an HTTPS `ipwho.is` lookup fallback, cached per IP and retried only until first success (`geo_attempted`); why: cf-* headers are unreliable outside Cloudflare and per-heartbeat lookups would be wasteful.
- All R2 files render through `cdnUrl()` in `src/lib/cdn.ts`; fixed site photos use `siteMedia` (`src/lib/site-media.ts`) under versioned immutable `site/vN/` keys, while tiny UI assets like the logo stay bundled; why: one media domain, long caching, no stale replacements.
- Uploaded R2 photos on public pages render via `cdnImageSet()`/`cdnImage()` (Cloudflare `/cdn-cgi/image` resizing); why: phones get small AVIF/WebP instead of originals.
- Inter/Montserrat are self-hosted via `@fontsource` Latin subsets imported in `styles.css` (key weights preloaded in `__root.tsx`) and SolaimanLipi from `/fonts/`; no Google Fonts or JS font injection; English stacks lead with Montserrat/Inter plus metric-matched fallbacks and `html[lang="bn"]` switches to SolaimanLipi first; why: no request chains, forced reflow or font-swap layout shift.
- `Accept: text/markdown` on public pages returns Markdown via `src/server.ts`; browsers get HTML; why: agent readiness without a separate pipeline.
- Visitor reports require dashboard.view and query the configured GA4 property via the server-side Google Cloud connector with keepEmptyRows and report timezone; why: property Viewer access needs no Admin API discovery.

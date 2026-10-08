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

- Admission documents upload directly from the browser to Cloudflare R2 via short-lived presigned PUT URLs from `src/lib/r2.functions.ts`; why: files never pass through app servers and R2 keys stay server-side.
- All R2 files render through the custom CDN via `cdnUrl()` in `src/lib/cdn.ts`; why: one place controls the public media domain.
- Admin/site media and avatars upload via `createMediaUploadUrl` (auth-required; non-avatar folders need admin); why: same direct-to-R2 pattern with server-side permission checks.
- Admission approval runs in the `approve_admission` DB function; why: student record + ID + enrollment are created atomically and admin-checked in SQL.
- Accounts are invite-only (admin `inviteUser` server fn); the Super Admin email is enforced in DB triggers; why: no public sign-up, and the owner's admin role can't be removed.
- Certificates: DB `issue_certificate` creates the serial atomically; the PDF is generated in the admin browser (`src/lib/certificate-pdf.ts`) and uploaded straight to R2 under `certificates/`; why: no PDF rendering on the edge worker, and serials stay unique.
- Student emails send via Resend from server functions in `src/lib/email.functions.ts` (templates in `email.server.ts`); recipients are always read from the database, never from the caller; why: the public form can't be abused to email arbitrary addresses.
- Page SEO goes through `seo()` in `PageHero.tsx` (canonical, og:url, optional og:image, noindex); the sitemap is router-derived via `staticData.sitemap` on every route plus published courses; why: one place for head tags and a sitemap that tracks routes automatically.

- Public site chrome is rendered only for public routes; admin navigation uses a fixed overlay drawer, not a content-shifting sidebar; why: auth/admin need a focused interface at every screen size.
- Route links preload on intent and public query data stays fresh briefly; why: repeat navigation avoids unnecessary network work while admin data remains independently refreshed.
- Password visibility and live complexity feedback share one auth component; why: login, recovery, invitation and profile use the same validated password rules.
- Account recovery never reveals whether an email is registered and requires explicit code entry after the generic send response; why: Supabase deliberately masks account existence.
- Auth fields share ASCII validation and digit normalization; profile phone rejects non-ASCII digits instead of normalizing them; why: profile input must enforce explicit English-digit entry.
- Avatar images are cropped and resized in-browser before direct R2 upload; why: predictable square images avoid oversized media and keep the existing signed-upload boundary.
- Supabase/R2 holds demo content; only allowlisted AI Literacy accepts test applications; why: other demos cannot enroll.
- Admin application edits go through the `update_admission_with_log` DB function, and views/downloads/decisions go through `log_admission_activity`; why: every change is recorded with its old value and the admin's name, in one transaction.
- Applicants view their own application via a random `access_token` link served by `get_application_by_token`; application PDFs are generated in the browser (`src/lib/application-pdf.ts`) from live data; why: there is no public read access to the table, and the PDF always reflects edits.
- Admission applications are saved only through the `submitAdmission` server function after server-side Turnstile verification, and `/admission` requires a `course` search param (otherwise it redirects to /courses); why: bots can't flood the form, and applicants always choose a course first.
- Student learning lives on `enrollments` (batch, progress, learning_status, absence_reminders) with `batches`/`class_sessions`/`attendance`; absence emails send from `sendAbsenceReminders` once per class (`reminded_at`) and only when the toggle is on; why: one source of truth and no duplicate reminders.
- The public pathway's sequence lives in `program-pathway.ts`; course details and admission stay in CMS records; why: a coherent journey preserves application history.
- Course images use `image_keys` (1–5; first is cover), cropped 16:9; apply windows are DB-enforced; why: legacy cards work and closed intakes can't be bypassed.
- Social profiles use `SocialLinks`; visible wordmarks use `BrandName`; why: shared brand data and styling stay consistent.
- Profile editing uses a shared client/server schema, combines split names into `full_name`, and stores structured address JSON in the existing address text column with legacy text fallback; why: validated self-only updates preserve existing profile consumers without a schema migration.
- Public pages translate EN↔BN automatically in the browser (`src/lib/i18n.tsx`) using cached AI translations from `translateTexts` stored in `site_translations`; admins correct wording at /admin/translations; elements with `translate="no"` are never translated; why: covers static and CMS content alike without per-string code or schema changes.

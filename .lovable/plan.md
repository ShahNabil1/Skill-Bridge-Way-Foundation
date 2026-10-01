# Skill Bridgeway Foundation — Phased Execution Plan

Note: the brand logo was mentioned but not attached. Please upload it with the Phase 1 prompt.

## Design system (applies to every phase)
- Colors: Deep Navy #0A192F (background), Vibrant Cyan #00A8FF (buttons/links/hover), Golden Orange #FF9900 (CTAs/highlights), White #FFFFFF (text), Light Grey #F4F6F8 (subtle text/dividers). Defined once as design tokens; no hardcoded colors in pages.
- Type: Montserrat Bold/ExtraBold for headings (ALL CAPS section titles), Inter for body.
- Visual language: glassmorphism cards, subtle grid/line patterns, crisp typography. No stock vector blobs or generic illustrations.
- Mobile-first, fast, per-page SEO tags (title, description, Open Graph), structured data for organization/courses/events (AEO).

## Phase 1 — Global Setup, Routing & Database Schema
- Enable Lovable Cloud (database, auth, realtime).
- Design tokens, fonts, logo, favicon, shared header (mobile menu) and footer.
- Create all public routes as shells: Home, About, Courses, Course Details, Notices/Events, Gallery, Contact, Admission, Verify Certificate.
- Auth page + protected Admin area shell.
- Schema with strict access rules:
  - `user_roles` (separate roles table, admin check function)
  - `courses`, `notices`, `gallery_items`, `contact_messages`
  - `admissions` (status: pending/approved/rejected, document file keys)
  - `students` (unique Student ID, e.g. SBF-2026-0001, generated on approval)
  - `enrollments` (student + course + completion state)
  - `certificates` (unique serial, issue date, verification fields)
- Public can read published courses/notices/gallery and verify certificates by serial only; everything else admin-only.

## Phase 2 — Public Website
- Home (hero, impact stats, featured courses, latest notices, CTA to admission).
- About, Courses list (filter), Course Details (dynamic, SEO per course), Notices/Events, Gallery (lightbox), Contact form (saved to database).
- Loaders with caching, skeletons, error/not-found states.

## Phase 3 — Admission System + Cloudflare R2
- Store R2 credentials as secrets; server function issues short-lived signed upload URLs (files never pass through public endpoints unchecked; type/size limits).
- Multi-step form: personal info -> education -> course choice -> documents -> review & submit. Validation with zod, progress indicator, mobile-friendly.
- Confirmation screen with application reference.

## Phase 4 — Admin CMS & Dashboard
- Dashboard overview (counts, recent applications, realtime new-admission updates).
- CRUD: courses, notices/events, gallery (uploads to R2), contact inbox.
- Admissions review: view documents via signed URLs, approve/reject with note. Approval atomically creates student + unique Student ID (database function, no duplicates).
- Admin role management.

## Phase 5 — Certification Engine & Verification Portal
- Admin marks enrollment complete -> certificate record with unique serial + QR code linking to the verify page.
- Branded certificate rendered as printable/downloadable PDF, stored in R2.
- Public Verify page: enter serial or scan QR; shows name, course, issue date, valid/revoked status. Rate-limited, exposes only safe fields.

## Phase 6 — Email Automation, SEO Polish & Launch
- Resend integration (API key as secret): emails on application submitted, approved (with Student ID), certificate issued (with verify link).
- sitemap.xml, robots.txt, structured data, Open Graph images, performance and accessibility pass.
- Security review of access rules, publish, connect custom domain via Cloudflare DNS.

## Technical details
- TanStack Start SSR; public data via public server functions, admin actions via authenticated server functions with role checks.
- Roles stored only in `user_roles` with a security-definer `has_role` function.
- R2 via S3-compatible signing (Worker-compatible library), Resend via fetch from server functions.
- Student ID and certificate serial generated in the database via sequences to guarantee uniqueness.

Approve this plan, then send "Execute Phase 1" (with the logo) to begin.

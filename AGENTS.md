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

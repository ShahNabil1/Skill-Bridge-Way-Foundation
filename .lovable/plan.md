# Admin Users: Manage page, sessions, activity reports, granular permissions

This is a large rebuild. It is split into 4 phases that ship one after another, and each phase is tested before the next starts.

## Phase 1: Granular permissions (replaces the single Admin toggle)
- A permission catalogue covers every admin page and the actions on it. Examples:
  - Applications: view, edit, approve/reject, delete, download documents
  - Students: view, view personal details, edit, attendance, send reminders
  - Certificates: generate, revoke, update all
  - Courses / Notices / Gallery / Partners / Translations: view, create, edit, publish, delete
  - Users: view list, create/invite, manage, view personal details, edit, reset password, revoke sessions, ban, delete, change permissions
- A role preset ("Full admin", "Editor", "Admissions officer", "Custom") ticks the boxes in one click. After that, individual actions can be ticked or unticked, so access can be full or partial.
- Database rules enforce every permission, not just the screens. A user without "Revoke certificate" is blocked even if they try to work around the interface.
- The Super Admin (toolsai674@gmail.com) always keeps full access and cannot be edited, banned or deleted.
- The admin menu and each button only appear when the user has that permission.

## Phase 2: Manage page (/admin/users/:id)
- Each row on the Users page gets a **Manage** button. The list also shows search, a status badge (Active / Invited / Banned) and the last sign-in.
- The Manage page shows:
  - Profile: name, email, phone, address, avatar. These are view-first, with an "Edit info" button.
  - Account actions, each with our confirmation dialog:
    - **Reset password:** a strong password is generated, emailed to the user through Resend, and shown once with a Copy button.
    - **Ban / Unban.**
    - **Delete account.**
  - The permissions editor from Phase 1.
- Every action is recorded in an audit log (who did what, and when).

## Phase 3: Real sessions and instant sign-out
- Each signed-in browser is recorded with:
  - the real IP address
  - the device, browser and operating system
  - the area/city and country, taken from Cloudflare's location data at the edge
  - when it started and when it was last active
- The Manage page lists all active sessions and has a "Sign out" button on each one, plus "Sign out everywhere".
- **Real-time:** a revoke, ban or delete signs that person out within seconds, without them refreshing the page. They then see a full-screen message on their screen:
  - "Your session was ended by an administrator. Please sign in again."
  - "Your account has been suspended. Contact info@skillbridgeway.org."
  - "Your account has been removed."

## Phase 4: Activity and time reports
- While an admin tab is open and visible, a lightweight signal every 60 seconds records active time and the current page. Important actions, such as approving an application or issuing a certificate, are also logged.
- The Manage page gets an Activity tab with:
  - Range filters: Today, Yesterday, This week, This month, and a custom date range.
  - Totals: total active time, sessions, actions, and the most-used pages.
  - A daily bar chart and a monthly summary table.
  - A detailed activity timeline with "See more".

## Technical details
- New tables: `permissions` (catalogue), `user_permissions`, `user_sessions` (device, IP, geo, last_seen, revoked_at), `user_activity` (heartbeats and actions), `user_admin_audit`.
- `has_permission(uid, key)` is a security definer function. Every existing admin RLS policy and admin DB function (approve_admission, issue_certificate, etc.) moves from `has_role('admin')` to the matching permission. Existing admins are migrated to "Full admin", so nothing breaks.
- Server functions use `requireSupabaseAuth` plus a permission check, with `supabaseAdmin` loaded only after that check:
  - ban: `auth.admin.updateUserById` with `ban_duration`
  - delete: `auth.admin.deleteUser`
  - password reset: `updateUserById` plus a Resend email
  - sign out a session: a definer function deletes the row from `auth.sessions` and marks `user_sessions.revoked_at`
- Real-time sign-out: Supabase Realtime on `user_sessions` (each user only sees their own rows). The client also checks the session on a heartbeat as a fallback, then calls `signOut` and shows the reason screen.
- IP and geo come from the `cf-connecting-ip`, `cf-ipcountry`, `cf-ipcity` and `cf-region` headers. On the local preview they will be blank, because geo works only on the published site.
- Tracking covers only signed-in admin users inside the admin panel. Public visitors are never tracked this way.

## Limits to know
- Sessions from before this ships won't show device or location until that person signs in again.
- City-level location is approximate. It comes from IP, not GPS.

# Admissions upgrade: secure application page, PDF, admin review page, activity log, smarter form

## 1. Applicant side (/admission)
- Hide the site footer during the whole admission flow.
- **Phone field**: Bangladesh flag + fixed `+88` on the left; the applicant types the 11-digit number. Hint: "Use an active number that also has WhatsApp — recommended so we can reach you quickly."
- **Address**: Division dropdown, then District (disabled until a division is chosen, shows only that division's districts), then Upazila/Thana (disabled until a district is chosen). Below that, detailed fields in the Bangladesh government form style: Village/Area / House & Road, Post Office, Post Code (4 digits).
- **Education**: Level, Institution, Board (Dhaka, Rajshahi, Madrasah, Technical, etc., or University for higher levels), Group/Subject, Result (GPA/CGPA/Division), Passing Year, or Session for courses still running (e.g. 2023–24).
- **No duplicate applications**: the same email or phone cannot apply twice to the same course unless the earlier application was rejected. The database enforces this, and the form shows a clear message with the earlier reference number hint.
- **After submit**: the success screen gets a "View my application" link to a short private address, e.g. `/application/k7Qm2xPa9T`. The code is random and impossible to guess, and the page has noindex. That page shows the full application, the photo as an avatar, each uploaded document (view/download), and a **Download PDF** button.

## 2. Branded application PDF
- An A4 PDF built in the browser: navy/cyan branding, logo, reference number, photo, all sections, a document list and a verification footer.
- It is always built from the latest data, so it reflects admin edits immediately.
- The same PDF is used on the applicant page and in the admin panel.

## 3. Admin: /admin/applications
- The menu item is renamed Applications. The old /admin/admissions address redirects to it.
- **List**: instant search by reference number, name, email or phone. Filters: status, course (active and past courses, including unpublished), division, district, education level and date range. A result count and a Clear filters button.
- **Review opens a full page** (`/admin/applications/<id>`) instead of a popup:
  - Left column: the applicant's photo as an avatar, name, a reference chip (click to copy), and a status badge.
  - Phone: click the number to copy it. A real phone icon calls the number (tel:). A WhatsApp icon in WhatsApp green opens wa.me. Each click gives an animated toast or ripple as feedback.
  - **View mode by default.** The Edit button unlocks all fields, including the same Division/District/Upazila picker and document replacement. Update stays disabled until something actually changes. Cancel restores the original values. An optional "Reason for change" note can be added.
  - Approve and Reject actions stay as they are, using the existing confirmation dialog.
  - Download PDF and per-document download buttons.
- **Activity log** (bottom of the page, newest first), recording:
  - Opened the review page (who, date and time)
  - Downloaded the full PDF
  - Downloaded or viewed a specific document (e.g. NID)
  - Field edits with old and new values, e.g. "Shahriar Nabil changed Full name from 'Tomal' to 'Tomal Mohanta'", plus the reason note
  - Approved / rejected

## Technical details
- Migration on `admissions`: add `division, district, upazila, address_line, post_office, postal_code, education_board, education_group, education_result, passing_year, session, access_token` (random 10–12 char, unique, default-generated). Keep the old `address` column for existing rows.
- Two duplicate rules on the same course, ignoring rejected applications: a partial unique index on `(lower(email), course_id)` and another on `(phone_normalized, course_id)`.
- Insert returns the token through a security-definer function `submit_admission(...)`, so anonymous users never get read access to the table.
- New table `admission_activity (id, admission_id, actor_id, actor_name, action, changes jsonb, note, created_at)`. Admins can insert and read only; nobody can update or delete. Grants and RLS included.
- Security-definer RPCs:
  - `get_application_by_token(token)` returns a single application with its documents and course title (anon allowed).
  - `update_admission_with_log(id, patch jsonb, note)` is admin-checked. It computes the field diff, updates the row and writes the log entry in one transaction.
- Static Bangladesh dataset (8 divisions / 64 districts / ~495 upazilas) in `src/lib/bd-locations.ts`. A reusable `AddressPicker` and `PhoneInput` serve both the form and the admin page.
- PDF in `src/lib/application-pdf.ts`, using the existing pdf-lib/fontkit setup like the certificate.
- New routes: `application.$token.tsx`, `_authenticated/admin.applications.tsx` (list), `_authenticated/admin.applications.$id.tsx` (review). The old admissions route becomes a redirect.
- Document links remain CDN URLs as today.

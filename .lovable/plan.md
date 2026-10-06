# Certificate format redesign

## Build
- Replace the current dark certificate with the supplied white-and-blue formal layout, closely matching its border, logo placement, typography, decorative heading, body copy, and spacing.
- Keep the learner name and course title dynamic from the existing certificate flow.
- Keep the certificate serial dynamic and display it in the upper-right certificate-number area.
- Retain the verification QR code and place it neatly near the lower-right area without obscuring the three signatory positions.
- Add the three signatory labels: Chairman, Executive Director (Operations), and Chief Trainer.
- Preserve the existing issue, upload, email, and public verification behavior.

## Verification
- Generate a sample certificate PDF using the real generator.
- Render it as an image and visually inspect alignment, clipping, typography, QR readability, and print margins.
- Check the project build status after the change.

## Technical details
- Update only the browser-side PDF template in `src/lib/certificate-pdf.ts`; no database or certificate workflow changes are needed.
- Use embedded fonts with safe fallbacks and the existing live logo source.

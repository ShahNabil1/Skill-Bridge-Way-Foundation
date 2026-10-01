import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5 MB

const input = z.object({
  admissionId: z.string().uuid(),
  fileName: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_DOC_TYPES),
  size: z.number().int().positive().max(MAX_DOC_BYTES),
});

/** Issues a short-lived presigned PUT URL so the browser uploads straight to R2. */
export const createAdmissionUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const accountId = process.env["R2_ACCOUNT_ID"];
    const accessKeyId = process.env["R2_ACCESS_KEY_ID"];
    const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"];
    const bucket = process.env["R2_BUCKET_NAME"];
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error("File upload is not configured yet.");
    }
    const { AwsClient } = await import("aws4fetch");
    const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });

    const ext = (data.fileName.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
    const key = `admissions/${data.admissionId}/${crypto.randomUUID()}.${ext}`;
    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
    url.searchParams.set("X-Amz-Expires", "300"); // 5 minutes

    const signed = await client.sign(new Request(url, { method: "PUT", headers: { "Content-Type": data.contentType } }), {
      aws: { signQuery: true },
    });
    return { uploadUrl: signed.url, key };
  });

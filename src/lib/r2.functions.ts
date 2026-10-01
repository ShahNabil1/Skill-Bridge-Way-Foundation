import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5 MB

function safeExt(fileName: string) {
  return (fileName.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
}

async function presignPut(key: string, contentType: string) {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const accessKeyId = process.env["R2_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"];
  const bucket = process.env["R2_BUCKET_NAME"];
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("File upload is not configured yet.");
  }
  const { AwsClient } = await import("aws4fetch");
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
  url.searchParams.set("X-Amz-Expires", "300"); // 5 minutes
  const signed = await client.sign(new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }), {
    aws: { signQuery: true },
  });
  return { uploadUrl: signed.url, key };
}

const admissionInput = z.object({
  admissionId: z.string().uuid(),
  fileName: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_DOC_TYPES),
  size: z.number().int().positive().max(MAX_DOC_BYTES),
});

/** Issues a short-lived presigned PUT URL so the browser uploads straight to R2. */
export const createAdmissionUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => admissionInput.parse(d))
  .handler(async ({ data }) =>
    presignPut(`admissions/${data.admissionId}/${crypto.randomUUID()}.${safeExt(data.fileName)}`, data.contentType),
  );

const mediaInput = z.object({
  folder: z.enum(["avatars", "courses", "gallery"]),
  fileName: z.string().min(1).max(200),
  contentType: z.enum(IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_DOC_BYTES),
});

/** Signed-in uploads: anyone may upload their own avatar; site media requires admin. */
export const createMediaUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => mediaInput.parse(d))
  .handler(async ({ data, context }) => {
    if (data.folder !== "avatars") {
      const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (!ok) throw new Error("Forbidden");
    }
    const prefix = data.folder === "avatars" ? `avatars/${context.userId}` : data.folder;
    return presignPut(`${prefix}/${crypto.randomUUID()}.${safeExt(data.fileName)}`, data.contentType);
  });

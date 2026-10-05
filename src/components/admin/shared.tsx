import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createMediaUploadUrl, IMAGE_TYPES, MAX_DOC_BYTES } from "@/lib/r2.functions";
import { cdnUrl } from "@/lib/cdn";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { asciiDigits, digitsOnly } from "@/lib/form-input";

export const selectCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

export function useCurrentUser() {
  return useRouteContext({ from: "/_authenticated" }).user;
}

export function useIsAdmin() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
    staleTime: 60_000,
  });
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { data: isAdmin, isLoading } = useIsAdmin();
  if (isLoading) return <p className="text-muted-foreground">Checking access...</p>;
  if (!isAdmin) return <div className="glass rounded-xl p-8 text-muted-foreground">You don't have admin access to this section.</div>;
  return <>{children}</>;
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="section-title text-2xl md:text-3xl">{title}</h1>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

/** Uploads an image straight to R2 via a presigned URL and returns its object key. */
export function useMediaUpload() {
  const sign = useServerFn(createMediaUploadUrl);
  return async (file: File, folder: "avatars" | "courses" | "gallery" | "notices" | "partners") => {
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) throw new Error("Use a JPG, PNG or WebP image");
    if (file.size > MAX_DOC_BYTES) throw new Error("Image must be under 5 MB");
    const { uploadUrl, key } = await sign({
      data: { folder, fileName: file.name, contentType: file.type as (typeof IMAGE_TYPES)[number], size: file.size },
    });
    const res = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } }).catch(() => null);
    if (!res?.ok) throw new Error("Upload failed");
    return key;
  };
}

export function ImageField({ value, onChange, folder }: { value: string | null; onChange: (k: string | null) => void; folder: "courses" | "gallery" }) {
  const upload = useMediaUpload();
  const [busy, setBusy] = useState(false);
  const src = cdnUrl(value);
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-muted-foreground" />}
      </div>
      <label className="cursor-pointer text-sm text-primary hover:underline">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : value ? "Replace image" : "Upload image"}
        <input type="file" accept={IMAGE_TYPES.join(",")} className="hidden" disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            try { onChange(await upload(f, folder)); } catch (err) { toast.error((err as Error).message); }
            setBusy(false);
          }} />
      </label>
      {value && <button type="button" className="text-sm text-muted-foreground hover:text-destructive" onClick={() => onChange(null)}>Remove</button>}
    </div>
  );
}

export function OtpField({ value, onChange, label = "Verification code" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [warning, setWarning] = useState(false);
  return (
    <div className="space-y-1.5">
      <InputOTP aria-label={label} pasteTransformer={asciiDigits} maxLength={6} value={value} onChange={(v) => { const clean = digitsOnly(v).slice(0, 6); setWarning(clean !== asciiDigits(v)); onChange(clean); }} inputMode="numeric" containerClassName="max-w-full overflow-x-auto">
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
        </InputOTPGroup>
      </InputOTP>
      {warning && <p role="status" className="text-xs text-highlight">Use English digits only.</p>}
    </div>
  );
}

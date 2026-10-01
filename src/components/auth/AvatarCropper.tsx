import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ImagePlus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { IMAGE_TYPES, MAX_DOC_BYTES } from "@/lib/r2.functions";
import { toast } from "sonner";

async function cropImage(url: string, area: Area): Promise<File> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image editing isn't available in this browser");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, 512, 512);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Couldn't crop image")), "image/webp", 0.86));
  return new File([blob], "avatar.webp", { type: "image/webp" });
}

export function AvatarCropper({ onSave, disabled }: { onSave: (file: File) => Promise<void>; disabled?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const close = () => { if (!busy) setUrl(null); };
  return <>
    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-primary transition-colors hover:text-foreground">
      <ImagePlus className="h-4 w-4" />{disabled ? "Uploading..." : "Change avatar"}
      <input aria-label="Choose avatar image" type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={disabled} onChange={(e) => {
        const file = e.target.files?.[0]; e.target.value = "";
        if (!file) return;
        if (!(IMAGE_TYPES as readonly string[]).includes(file.type) || file.size > MAX_DOC_BYTES) { toast.error("Use a JPG, PNG or WebP under 5 MB"); return; }
        setCrop({ x: 0, y: 0 }); setZoom(1); setArea(null); setUrl(URL.createObjectURL(file));
      }} />
    </label>
    <Dialog open={!!url} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-md p-5 sm:p-6">
        <DialogTitle>Crop avatar</DialogTitle>
        <DialogDescription>Position your photo inside the circle.</DialogDescription>
        <div className="relative h-[min(52vh,380px)] min-h-56 w-full overflow-hidden rounded-md bg-muted">
          {url && <Cropper image={url} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
            onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setArea(pixels)} />}
        </div>
        <div className="flex items-center gap-3"><RotateCcw className="h-4 w-4 text-muted-foreground" /><input aria-label="Avatar zoom" className="w-full accent-primary" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={close} disabled={busy}>Cancel</Button><Button type="button" disabled={!area || busy} onClick={async () => {
          if (!url || !area) return;
          setBusy(true);
          try { await onSave(await cropImage(url, area)); setUrl(null); } catch (error) { toast.error((error as Error).message); }
          finally { setBusy(false); }
        }}>{busy ? "Saving..." : "Save avatar"}</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
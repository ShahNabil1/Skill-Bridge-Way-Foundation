import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { GripVertical, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useMediaUpload } from "@/components/admin/shared";
import { IMAGE_TYPES } from "@/lib/r2.functions";
import { cdnUrl } from "@/lib/cdn";
import { COURSE_IMAGE, MAX_COURSE_IMAGES } from "@/lib/course-content";

async function crop(url: string, a: Area): Promise<File> {
  const img = new Image(); img.src = url; await img.decode();
  const canvas = document.createElement("canvas");
  const w = Math.min(COURSE_IMAGE.w, Math.round(a.width)); canvas.width = w; canvas.height = Math.round(w / COURSE_IMAGE.aspect);
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Image editing isn't available");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, a.x, a.y, a.width, a.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't crop"))), "image/webp", 0.88));
  return new File([blob], "course.webp", { type: "image/webp" });
}

function Thumb({ k, i, onRemove }: { k: string; i: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: k });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`group relative aspect-video overflow-hidden rounded-lg border bg-muted ${isDragging ? "z-10 border-primary shadow-xl" : "border-border"}`}>
    <img src={cdnUrl(k)!} alt={`Course image ${i + 1}`} className="h-full w-full object-cover" />
    <button type="button" {...attributes} {...listeners} aria-label="Drag to reorder" className="absolute inset-0 flex cursor-grab items-start p-1.5 active:cursor-grabbing"><span className="rounded bg-background/80 p-1"><GripVertical className="h-4 w-4" /></span></button>
    {i === 0 && <span className="absolute bottom-1.5 left-1.5 rounded bg-highlight px-2 py-0.5 text-[10px] font-bold uppercase text-highlight-foreground">Cover</span>}
    <button type="button" onClick={onRemove} aria-label="Remove image" className="absolute right-1.5 top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground opacity-90 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
  </div>;
}

export function CourseImages({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const upload = useMediaUpload();
  const [queue, setQueue] = useState<File[]>([]);
  const [url, setUrl] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => { const f = queue[0]; if (!f) { setUrl(null); return; } const u = URL.createObjectURL(f); setUrl(u); setPos({ x: 0, y: 0 }); setZoom(1); setArea(null); return () => URL.revokeObjectURL(u); }, [queue]);
  const left = MAX_COURSE_IMAGES - value.length;

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    onChange(arrayMove(value, value.indexOf(String(e.active.id)), value.indexOf(String(e.over.id))));
  }
  async function save() {
    if (!url || !area) return;
    setBusy(true);
    try { const key = await upload(await crop(url, area), "courses"); onChange([...value, key]); setQueue((q) => q.slice(1)); }
    catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  }

  return <div className="space-y-3">
    <p className="text-xs text-muted-foreground">Recommended: <b className="text-foreground">16:9, 1600 × 900 px</b> (JPG/PNG/WebP, under 5 MB). This ratio stays sharp on phones, laptops and large screens and matches social share previews. You'll crop each image after choosing it. Drag to reorder — the first image is the cover. {value.length}/{MAX_COURSE_IMAGES} used, at least 1 required.</p>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={value} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {value.map((k, i) => <Thumb key={k} k={k} i={i} onRemove={() => onChange(value.filter((x) => x !== k))} />)}
          {left > 0 && <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
            <ImagePlus className="h-6 w-6" />Add image
            <input type="file" multiple accept={IMAGE_TYPES.join(",")} className="sr-only" onChange={(e) => {
              const files = Array.from(e.target.files ?? []).filter((f) => (IMAGE_TYPES as readonly string[]).includes(f.type)); e.target.value = "";
              if (files.length > left) toast.warning(`Only ${left} more image${left > 1 ? "s" : ""} allowed`);
              setQueue(files.slice(0, left));
            }} />
          </label>}
        </div>
      </SortableContext>
    </DndContext>
    <Dialog open={!!url} onOpenChange={(o) => { if (!o && !busy) setQueue([]); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl p-5">
        <DialogTitle>Crop image{queue.length > 1 ? ` (${queue.length} left)` : ""}</DialogTitle>
        <DialogDescription>Drag to position and zoom. The frame is the exact 16:9 area shown on the website.</DialogDescription>
        <div className="relative h-[min(55vh,420px)] w-full overflow-hidden rounded-md bg-muted">
          {url && <Cropper image={url} crop={pos} zoom={zoom} aspect={COURSE_IMAGE.aspect} onCropChange={setPos} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />}
        </div>
        <input aria-label="Zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-primary" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setQueue((q) => q.slice(1))}>Skip</Button>
          <Button type="button" disabled={!area || busy} onClick={save}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Crop & upload</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}

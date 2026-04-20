import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { savePhoto, deletePhoto, type Trip } from "@/lib/storage";
import { usePhotoUrls } from "@/hooks/usePhotoUrls";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";

interface Props {
  countryName: string;
  color: string;
  trip?: Trip;
  isFirstTrip: boolean;
  onSave: (color: string, trip: Trip) => void;
  onRemoveTrip?: () => void;
  onRemoveCountry: () => void;
  onClose: () => void;
}

const PRESETS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
];

async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality);
  });
}

export function CountryEditor({
  countryName,
  color: initialColor,
  trip,
  isFirstTrip,
  onSave,
  onRemoveTrip,
  onRemoveCountry,
  onClose,
}: Props) {
  const [color, setColor] = useState(initialColor);
  const [date, setDate] = useState(trip?.date ?? "");
  const [endDate, setEndDate] = useState(trip?.endDate ?? "");
  const [description, setDescription] = useState(trip?.description ?? "");
  const [photoIds, setPhotoIds] = useState<string[]>(trip?.photoIds ?? []);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const urls = usePhotoUrls(photoIds);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newIds: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const blob = await compressImage(file);
        const id = await savePhoto(blob);
        newIds.push(id);
      }
      setPhotoIds((prev) => [...prev, ...newIds]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async (id: string) => {
    setPhotoIds((prev) => prev.filter((p) => p !== id));
    await deletePhoto(id);
  };

  const handleSave = () => {
    onSave(color, {
      id: trip?.id ?? `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: date || undefined,
      endDate: endDate || undefined,
      description: description.trim() || undefined,
      photoIds: photoIds.length ? photoIds : undefined,
    });
  };

  const isEdit = !!trip;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom-4 duration-300"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="mx-auto flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl border border-border/50 bg-card/95 backdrop-blur-xl"
        style={{ boxShadow: "var(--shadow-float)" }}
      >
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <div className="mb-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {isEdit ? "Edit trip" : isFirstTrip ? "Mark visited" : "Add trip"}
              </p>
              <h2 className="truncate text-lg font-semibold text-foreground">{countryName}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">
          {/* Color (only on first trip) */}
          {isFirstTrip && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Country color</p>
              <div className="grid grid-cols-8 gap-2">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="relative aspect-square rounded-full transition-transform hover:scale-110 active:scale-95"
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  >
                    {color.toLowerCase() === c.toLowerCase() && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check size={14} strokeWidth={3} className="text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-muted/60 p-2.5">
                <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-border" style={{ backgroundColor: color }}>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
                <p className="flex-1 font-mono text-xs uppercase text-muted-foreground">{color}</p>
              </div>
            </div>
          )}

          {/* Date range */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Trip dates
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="trip-start" className="mb-1 block text-[11px] text-muted-foreground">
                  Start
                </label>
                <Input
                  id="trip-start"
                  type="date"
                  value={date}
                  max={endDate || undefined}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="trip-end" className="mb-1 block text-[11px] text-muted-foreground">
                  End
                </label>
                <Input
                  id="trip-end"
                  type="date"
                  value={endDate}
                  min={date || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="trip-desc" className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <Textarea
              id="trip-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A few notes about your trip…"
              rows={3}
              className="resize-none rounded-xl"
            />
          </div>

          {/* Photos */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Photos</p>
            <div className="grid grid-cols-3 gap-2">
              {photoIds.map((id) => (
                <div key={id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                  {urls[id] ? (
                    <img src={urls[id]} alt="Trip" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-muted-foreground/10" />
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(id)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border/60 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={20} strokeWidth={2} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Add</span>
                  </>
                )}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-border/40 p-4">
          <Button onClick={handleSave} className="w-full rounded-2xl" size="lg">
            Save trip
          </Button>
          {isEdit && onRemoveTrip && (
            <button
              onClick={onRemoveTrip}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 size={14} />
              Delete this trip
            </button>
          )}
          {!isEdit && !isFirstTrip && (
            <button
              onClick={onClose}
              className="w-full rounded-2xl py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          )}
          {isFirstTrip && (
            <button
              onClick={onRemoveCountry}
              className="w-full rounded-2xl py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              Remove from visited
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

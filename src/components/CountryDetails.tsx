import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePhotoUrls } from "@/hooks/usePhotoUrls";
import { savePhoto, deletePhoto, type CountryEntry, type Trip } from "@/lib/storage";
import { formatDateRange, formatDuration, tripDurationDays } from "@/lib/dates";
import { Calendar, Check, ChevronDown, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

interface Props {
  countryName: string;
  entry: CountryEntry;
  onUpdateTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onAddTrip: () => void;
  onClose: () => void;
}

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

function TripRow({
  trip,
  onUpdate,
  onDelete,
}: {
  trip: Trip;
  onUpdate: (t: Trip) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Trip>(trip);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urls = usePhotoUrls(draft.photoIds);

  // Sync draft when trip prop changes (e.g. external update)
  useEffect(() => {
    if (!editing) setDraft(trip);
  }, [trip, editing]);

  const duration = tripDurationDays(trip.date, trip.endDate);
  const durationLabel = formatDuration(duration);

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
      setDraft((d) => ({ ...d, photoIds: [...(d.photoIds ?? []), ...newIds] }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async (id: string) => {
    setDraft((d) => ({ ...d, photoIds: (d.photoIds ?? []).filter((p) => p !== id) }));
    await deletePhoto(id);
  };

  const save = () => {
    onUpdate({
      ...draft,
      date: draft.date || undefined,
      endDate: draft.endDate || undefined,
      description: draft.description?.trim() || undefined,
      photoIds: draft.photoIds && draft.photoIds.length ? draft.photoIds : undefined,
    });
    setEditing(false);
  };

  const cancel = () => {
    setDraft(trip);
    setEditing(false);
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-muted/60">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card">
            <Calendar size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {formatDateRange(trip.date, trip.endDate)}
            </p>
            {durationLabel && (
              <p className="text-[11px] text-muted-foreground">{durationLabel}</p>
            )}
          </div>
          <ChevronDown
            size={16}
            strokeWidth={2.5}
            className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="space-y-3 border-t border-border/40 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {trip.description && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {trip.description}
              </p>
            )}
            {trip.photoIds && trip.photoIds.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {trip.photoIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => urls[id] && setLightbox(urls[id])}
                    className="aspect-square overflow-hidden rounded-xl bg-muted transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    {urls[id] ? (
                      <img src={urls[id]} alt="Trip" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full animate-pulse bg-muted-foreground/10" />
                    )}
                  </button>
                ))}
              </div>
            )}
            {!trip.description && (!trip.photoIds || trip.photoIds.length === 0) && (
              <p className="text-xs italic text-muted-foreground">No description or photos yet.</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 rounded-xl"
                onClick={() => {
                  setDraft(trip);
                  setEditing(true);
                }}
              >
                <Pencil size={14} className="mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                aria-label="Delete trip"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-background animate-in fade-in duration-200"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
            <button
              onClick={cancel}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cancel"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
            <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-foreground">
              Edit trip
            </h2>
            <Button size="sm" className="rounded-xl" onClick={save}>
              <Check size={14} className="mr-1" />
              Save
            </Button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Trip dates
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">Start</label>
                  <Input
                    type="date"
                    value={draft.date ?? ""}
                    max={draft.endDate || undefined}
                    onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">End</label>
                  <Input
                    type="date"
                    value={draft.endDate ?? ""}
                    min={draft.date || undefined}
                    onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="A few notes about your trip…"
                rows={5}
                className="resize-none rounded-xl"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Photos
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(draft.photoIds ?? []).map((id) => (
                  <div key={id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                    {urls[id] ? (
                      <img src={urls[id]} alt="Trip" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full animate-pulse bg-muted-foreground/10" />
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(id)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-90"
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
                      <Plus size={20} />
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
        </div>
      )}

      {lightbox && (
        <button
          type="button"
          aria-label="Close photo"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 animate-in fade-in"
        >
          <img src={lightbox} alt="Photo" className="max-h-full max-w-full rounded-lg object-contain" />
        </button>
      )}
    </>
  );
}

export function CountryDetails({
  countryName,
  entry,
  onUpdateTrip,
  onDeleteTrip,
  onAddTrip,
  onClose,
}: Props) {
  const trips = entry.trips ?? [];
  const hasTrips = trips.length > 0;
  const scrollable = trips.length >= 5;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom-4 duration-300"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="mx-auto flex max-h-[92vh] min-h-[60vh] w-full max-w-md flex-col rounded-t-3xl border border-border/50 bg-card/95 backdrop-blur-xl"
        style={{ boxShadow: "var(--shadow-float)" }}
      >
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="h-4 w-4 shrink-0 rounded-full ring-2 ring-border"
                style={{ backgroundColor: entry.color }}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Visited{hasTrips ? ` · ${trips.length} trip${trips.length > 1 ? "s" : ""}` : ""}
                </p>
                <h2 className="truncate text-lg font-semibold text-foreground">{countryName}</h2>
              </div>
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

        <div className="min-h-0 flex-1 px-5 pb-2">
          {!hasTrips ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No trip added yet for this country.</p>
              <Button onClick={onAddTrip} size="lg" className="rounded-2xl">
                <Plus size={18} className="mr-1" />
                Add trip
              </Button>
            </div>
          ) : (
            <div className={`space-y-2 ${scrollable ? "max-h-[60vh] overflow-y-auto pr-1" : ""}`}>
              {trips.map((t) => (
                <TripRow
                  key={t.id}
                  trip={t}
                  onUpdate={onUpdateTrip}
                  onDelete={() => onDeleteTrip(t.id)}
                />
              ))}
            </div>
          )}
        </div>

        {hasTrips && (
          <div className="shrink-0 border-t border-border/40 p-4">
            <Button
              onClick={onAddTrip}
              className="w-full rounded-2xl"
              size="lg"
              variant="secondary"
            >
              <Plus size={18} className="mr-1" />
              Add another trip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

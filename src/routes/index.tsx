import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { WorldMap } from "@/components/WorldMap";
import { CountryEditor } from "@/components/CountryEditor";
import { CountryDetails } from "@/components/CountryDetails";
import { MapControls } from "@/components/MapControls";
import { RotateHint } from "@/components/RotateHint";
import {
  loadVisited,
  saveVisited,
  loadTheme,
  saveTheme,
  deletePhoto,
  type VisitedMap,
  type Trip,
} from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visited Countries Map — Track Your Travels" },
      {
        name: "description",
        content: "An interactive world map to color and track every country you've visited. Add dates, descriptions, and photos for each trip.",
      },
      { property: "og:title", content: "Visited Countries Map" },
      { property: "og:description", content: "Color the countries you've visited and capture the memories from each trip." },
    ],
  }),
  component: Index,
});

type Mode =
  | { kind: "details" }
  | { kind: "edit"; tripId?: string }; // tripId omitted = adding new

interface Selected {
  id: string;
  name: string;
  mode: Mode;
}

function Index() {
  const [visited, setVisited] = useState<VisitedMap>({});
  const [selected, setSelected] = useState<Selected | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setVisited(loadVisited());
    const t = loadTheme();
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveVisited(visited);
  }, [visited, hydrated]);

  const handleCountryClick = useCallback(
    (id: string, name: string) => {
      const existing = visited[id];
      if (existing) {
        setSelected({ id, name, mode: { kind: "details" } });
      } else {
        setSelected({ id, name, mode: { kind: "edit" } });
      }
    },
    [visited],
  );

  const saveTrip = (color: string, trip: Trip) => {
    if (!selected) return;
    setVisited((v) => {
      const existing = v[selected.id];
      const trips = existing?.trips ?? [];
      const idx = trips.findIndex((t) => t.id === trip.id);
      const nextTrips = idx >= 0
        ? trips.map((t) => (t.id === trip.id ? trip : t))
        : [...trips, trip];
      return { ...v, [selected.id]: { color, trips: nextTrips } };
    });
    // After saving, return to details if there's content, otherwise close
    setSelected((s) => (s ? { ...s, mode: { kind: "details" } } : s));
  };

  const removeTrip = async (tripId: string) => {
    if (!selected) return;
    const existing = visited[selected.id];
    if (!existing) return;
    const trip = existing.trips.find((t) => t.id === tripId);
    if (trip?.photoIds) {
      await Promise.all(trip.photoIds.map((id) => deletePhoto(id)));
    }
    const remaining = existing.trips.filter((t) => t.id !== tripId);
    setVisited((v) => {
      if (remaining.length === 0) {
        // Auto-remove country when no trips left
        const { [selected.id]: _, ...rest } = v;
        return rest;
      }
      return { ...v, [selected.id]: { ...existing, trips: remaining } };
    });
    if (remaining.length === 0) {
      setSelected(null);
    } else {
      setSelected((s) => (s ? { ...s, mode: { kind: "details" } } : s));
    }
  };

  const removeCountry = async () => {
    if (!selected) return;
    const existing = visited[selected.id];
    if (existing) {
      const allPhotos = existing.trips.flatMap((t) => t.photoIds ?? []);
      await Promise.all(allPhotos.map((id) => deletePhoto(id)));
    }
    setVisited((v) => {
      const { [selected.id]: _, ...rest } = v;
      return rest;
    });
    setSelected(null);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    saveTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const resetAll = async () => {
    if (confirm("Clear all visited countries? This cannot be undone.")) {
      const allPhotoIds = Object.values(visited).flatMap((e) =>
        e.trips.flatMap((t) => t.photoIds ?? []),
      );
      await Promise.all(allPhotoIds.map((id) => deletePhoto(id)));
      setVisited({});
    }
  };

  const count = Object.values(visited).filter((e) => e.trips.length > 0).length;
  const currentEntry = selected ? visited[selected.id] : undefined;
  const editingTripId =
    selected?.mode.kind === "edit" ? selected.mode.tripId : undefined;
  const editingTrip =
    editingTripId && currentEntry
      ? currentEntry.trips.find((t) => t.id === editingTripId)
      : undefined;

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <h1 className="sr-only">Visited Countries Map</h1>
      <WorldMap
        visited={visited}
        onCountryClick={handleCountryClick}
        selectedId={selected?.id ?? null}
      />
      <MapControls
        count={count}
        theme={theme}
        onToggleTheme={toggleTheme}
        onReset={resetAll}
      />
      <RotateHint />
      {selected && (
        <>
          <button
            type="button"
            aria-label="Close panel"
            className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-[1px] animate-in fade-in"
            onClick={() => setSelected(null)}
          />
          {selected.mode.kind === "details" && currentEntry ? (
            <CountryDetails
              countryName={selected.name}
              entry={currentEntry}
              onAddTrip={() => setSelected({ ...selected, mode: { kind: "edit" } })}
              onUpdateTrip={(trip) => saveTrip(currentEntry.color, trip)}
              onDeleteTrip={(tripId) => removeTrip(tripId)}
              onClose={() => setSelected(null)}
            />
          ) : (
            <CountryEditor
              countryName={selected.name}
              color={currentEntry?.color ?? "#3b82f6"}
              trip={editingTrip}
              isFirstTrip={!currentEntry || currentEntry.trips.length === 0}
              onSave={saveTrip}
              onRemoveTrip={
                editingTrip ? () => removeTrip(editingTrip.id) : undefined
              }
              onRemoveCountry={removeCountry}
              onClose={() => {
                if (currentEntry) {
                  setSelected({ ...selected, mode: { kind: "details" } });
                } else {
                  setSelected(null);
                }
              }}
            />
          )}
        </>
      )}
    </main>
  );
}

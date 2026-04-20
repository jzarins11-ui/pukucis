import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import worldData from "@/assets/world-countries.json";
import { loadVisited, type Trip, type VisitedMap } from "@/lib/storage";
import { formatDateRange, formatDuration, tripDurationDays } from "@/lib/dates";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/trips")({
  head: () => ({
    meta: [
      { title: "Trips Timeline — Visited Countries Map" },
      {
        name: "description",
        content: "All your trips across every country, sorted chronologically. Tap to edit dates, descriptions, and photos.",
      },
    ],
  }),
  component: TripsPage,
});

interface TimelineItem {
  trip: Trip;
  countryId: string;
  countryName: string;
  color: string;
  sortKey: number;
}

function buildCountryNameMap(): Record<string, string> {
  const out: Record<string, string> = {};
  const features = (worldData as { objects?: Record<string, { geometries?: Array<{ id?: string | number; properties?: { name?: string } }> }> }).objects;
  if (!features) return out;
  for (const obj of Object.values(features)) {
    if (!obj.geometries) continue;
    for (const g of obj.geometries) {
      if (g.id != null) out[String(g.id)] = g.properties?.name ?? String(g.id);
    }
  }
  return out;
}

function flattenTrips(visited: VisitedMap, names: Record<string, string>): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const [countryId, entry] of Object.entries(visited)) {
    for (const trip of entry.trips) {
      const dateForSort = trip.date || trip.endDate;
      const sortKey = dateForSort ? new Date(dateForSort + "T00:00:00").getTime() : -Infinity;
      items.push({
        trip,
        countryId,
        countryName: names[countryId] ?? countryId,
        color: entry.color,
        sortKey,
      });
    }
  }
  // Most recent first; undated trips at bottom
  return items.sort((a, b) => {
    if (a.sortKey === -Infinity && b.sortKey === -Infinity) return 0;
    if (a.sortKey === -Infinity) return 1;
    if (b.sortKey === -Infinity) return -1;
    return b.sortKey - a.sortKey;
  });
}

function TripsPage() {
  const [visited, setVisited] = useState<VisitedMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setVisited(loadVisited());
    setHydrated(true);
  }, []);

  const names = buildCountryNameMap();
  const items = flattenTrips(visited, names);

  return (
    <main className="min-h-screen bg-background">
      <header
        className="sticky top-0 z-20 border-b border-border/50 bg-card/80 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Back to map">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Timeline
            </p>
            <h1 className="truncate text-lg font-semibold text-foreground">All trips</h1>
          </div>
          {hydrated && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
              {items.length}
            </span>
          )}
        </div>
      </header>

      <div
        className="mx-auto max-w-2xl px-4 py-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        {hydrated && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 p-8 text-center">
            <Calendar size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No trips yet. Tap a country on the map to add one.
            </p>
            <Link to="/">
              <Button className="rounded-2xl">Open map</Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map(({ trip, countryId, countryName, color }) => {
              const duration = formatDuration(tripDurationDays(trip.date, trip.endDate));
              return (
                <li key={`${countryId}-${trip.id}`}>
                  <Link
                    to="/"
                    search={{ country: countryId } as never}
                    className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card p-3 transition-colors hover:bg-muted/60"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full ring-2 ring-border"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <MapPin size={12} className="shrink-0 text-muted-foreground" />
                        <span className="truncate">{countryName}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateRange(trip.date, trip.endDate)}
                        {duration && <span> · {duration}</span>}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

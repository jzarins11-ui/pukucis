import { useMemo, useState, useRef, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import worldData from "@/assets/world-countries.json";
import type { VisitedMap } from "@/lib/storage";

interface WorldMapProps {
  visited: VisitedMap;
  onCountryClick: (id: string, name: string) => void;
  selectedId: string | null;
}

export function WorldMap({ visited, onCountryClick, selectedId }: WorldMapProps) {
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [10, 20],
    zoom: 1,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const geographies = useMemo(() => worldData, []);

  // Equirectangular projection. Width = 2π·scale, height = π·scale.
  // In portrait we bias toward filling width so countries appear larger and
  // the user can pan vertically to reach the poles comfortably.
  const isPortrait = size.h > size.w;
  const baseScale = isPortrait
    ? size.w / (2 * Math.PI) * 1.15
    : Math.min(size.w / (2 * Math.PI), size.h / Math.PI);

  // Add generous padding around the map so edge countries (NZ, Alaska,
  // Greenland, Patagonia) can be scrolled fully into view instead of being
  // clipped by the viewport border.
  const padX = size.w * 0.25;
  const padY = size.h * 0.25;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 select-none touch-none overscroll-none"
      style={{ backgroundColor: "var(--map-ocean)" }}
    >
      <ComposableMap
        projection="geoEquirectangular"
        width={size.w}
        height={size.h}
        projectionConfig={{ scale: baseScale }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={1}
          maxZoom={8}
          translateExtent={[
            [-padX, -padY],
            [size.w + padX, size.h + padY],
          ]}
          onMoveEnd={(pos: { coordinates: [number, number]; zoom: number }) =>
            setPosition(pos)
          }
        >
          <Geographies geography={geographies}>
            {({ geographies: geos }: { geographies: Array<{ rsmKey: string; id: string | number; properties: { name?: string } }> }) =>
              geos.map((geo) => {
                const id = String(geo.id);
                const name = geo.properties?.name ?? "Unknown";
                const entry = visited[id];
                const isVisited = !!entry && entry.trips.length > 0;
                const fill = isVisited ? entry.color : "var(--map-unvisited)";
                const isSelected = selectedId === id;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => onCountryClick(id, name)}
                    style={{
                      default: {
                        fill,
                        stroke: "var(--map-stroke)",
                        strokeWidth: 0.4,
                        outline: "none",
                        transition: "fill 0.3s ease",
                      },
                      hover: {
                        fill: isVisited ? entry.color : "var(--map-stroke)",
                        stroke: "var(--foreground)",
                        strokeWidth: 0.8,
                        outline: "none",
                        cursor: "pointer",
                      },
                      pressed: {
                        fill,
                        outline: "none",
                      },
                    }}
                    className={isSelected ? "animate-pulse" : ""}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}

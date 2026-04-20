import { Link } from "@tanstack/react-router";
import { List, Moon, Sun, Trash2 } from "lucide-react";

interface MapControlsProps {
  count: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onReset: () => void;
}

export function MapControls({ count, theme, onToggleTheme, onReset }: MapControlsProps) {
  return (
    <>
      {/* Top-left: counter */}
      <div
        className="pointer-events-auto absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-4 py-2 backdrop-blur-xl"
        style={{ boxShadow: "var(--shadow-float)", paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <span className="text-2xl font-bold tabular-nums text-foreground">{count}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {count === 1 ? "country" : "countries"}
        </span>
      </div>

      {/* Top-right: trips, theme, reset */}
      <div
        className="pointer-events-auto absolute right-4 top-4 z-30 flex gap-2"
        style={{ paddingTop: "max(0rem, env(safe-area-inset-top))" }}
      >
        <Link
          to="/trips"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-card/80 text-foreground backdrop-blur-xl transition-transform hover:scale-105 active:scale-95"
          style={{ boxShadow: "var(--shadow-float)" }}
          aria-label="Trips timeline"
        >
          <List size={18} />
        </Link>
        <button
          onClick={onToggleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-card/80 text-foreground backdrop-blur-xl transition-transform hover:scale-105 active:scale-95"
          style={{ boxShadow: "var(--shadow-float)" }}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {count > 0 && (
          <button
            onClick={onReset}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-card/80 text-foreground backdrop-blur-xl transition-transform hover:scale-105 active:scale-95 hover:text-destructive"
            style={{ boxShadow: "var(--shadow-float)" }}
            aria-label="Reset all"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </>
  );
}


import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

const DISMISS_KEY = "vcm:rotate-hint-dismissed:v1";

export function RotateHint() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const isPortrait = window.innerHeight > window.innerWidth;
    const isPhone = window.innerWidth < 640;
    if (!isPortrait || !isPhone) return;

    setMounted(true);
    const leaveTimer = setTimeout(() => setLeaving(true), 5000);
    const unmountTimer = setTimeout(() => {
      setMounted(false);
      sessionStorage.setItem(DISMISS_KEY, "1");
    }, 5500); // 500ms exit transition

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-4 z-30 flex max-w-[90vw] -translate-x-1/2 items-center gap-2.5 rounded-full border border-border/50 bg-card/90 px-3 py-2 backdrop-blur-xl transition-all duration-500 ease-out ${
        leaving
          ? "-translate-y-12 opacity-0"
          : "translate-y-0 opacity-100 animate-in fade-in slide-in-from-top-2"
      }`}
      style={{ boxShadow: "var(--shadow-float)", left: "50%" }}
      role="status"
    >
      <RotateCw size={14} className="shrink-0 text-muted-foreground" />
      <p className="truncate text-xs font-medium text-foreground">
        Rotate to landscape for the best view
      </p>
    </div>
  );
}

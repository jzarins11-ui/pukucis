export function formatDateShort(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateRange(start?: string, end?: string) {
  if (start && end && start !== end) return `${formatDateShort(start)} → ${formatDateShort(end)}`;
  if (start) return formatDateShort(start);
  if (end) return formatDateShort(end);
  return "Untitled trip";
}

export function tripDurationDays(start?: string, end?: string): number | null {
  if (!start) return null;
  const s = new Date(start + "T00:00:00");
  if (isNaN(s.getTime())) return null;
  if (!end || end === start) return 1;
  const e = new Date(end + "T00:00:00");
  if (isNaN(e.getTime())) return 1;
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  return diff > 0 ? diff : 1;
}

export function formatDuration(days: number | null): string | null {
  if (!days) return null;
  return `${days} day${days === 1 ? "" : "s"}`;
}

const KEY = "vcm:visited:v3";
const LEGACY_V2_KEY = "vcm:visited:v2";
const LEGACY_V1_KEY = "vcm:visited:v1";
const THEME_KEY = "vcm:theme:v1";

export interface Trip {
  id: string;
  date?: string; // ISO yyyy-mm-dd (start)
  endDate?: string; // ISO yyyy-mm-dd (end)
  description?: string;
  photoIds?: string[];
}

export interface CountryEntry {
  color: string;
  trips: Trip[];
}

export type VisitedMap = Record<string, CountryEntry>;

export function newTripId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// v2 shape kept around for migration only
interface LegacyV2Entry {
  color: string;
  date?: string;
  endDate?: string;
  description?: string;
  photoIds?: string[];
}

function migrateV2(old: Record<string, LegacyV2Entry>): VisitedMap {
  const out: VisitedMap = {};
  for (const [k, e] of Object.entries(old)) {
    const hasTrip = e.date || e.endDate || e.description || (e.photoIds && e.photoIds.length);
    out[k] = {
      color: e.color,
      trips: hasTrip
        ? [{
            id: newTripId(),
            date: e.date,
            endDate: e.endDate,
            description: e.description,
            photoIds: e.photoIds,
          }]
        : [],
    };
  }
  return out;
}

export function loadVisited(): VisitedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as VisitedMap;
    const v2 = localStorage.getItem(LEGACY_V2_KEY);
    if (v2) {
      const migrated = migrateV2(JSON.parse(v2) as Record<string, LegacyV2Entry>);
      localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
    const v1 = localStorage.getItem(LEGACY_V1_KEY);
    if (v1) {
      const old = JSON.parse(v1) as Record<string, string>;
      const migrated: VisitedMap = {};
      for (const [k, color] of Object.entries(old)) migrated[k] = { color, trips: [] };
      localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveVisited(map: VisitedMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function loadTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function saveTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
}

/* ---------------- IndexedDB photo store ---------------- */

const DB_NAME = "vcm-photos";
const STORE = "photos";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePhoto(blob: Blob): Promise<string> {
  const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPhoto(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deletePhoto(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

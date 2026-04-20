import { useEffect, useState } from "react";
import { getPhoto } from "@/lib/storage";

export function usePhotoUrls(ids: string[] | undefined) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ids || ids.length === 0) {
      setUrls({});
      return;
    }
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const id of ids) {
        const blob = await getPhoto(id);
        if (blob) {
          const url = URL.createObjectURL(blob);
          created.push(url);
          next[id] = url;
        }
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [ids?.join("|")]);

  return urls;
}

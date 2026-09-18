"use client";

import { useState, useEffect } from "react";

export function useRealtime<T>(url: string | null): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        setData(JSON.parse(event.data));
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [url]);

  return data;
}

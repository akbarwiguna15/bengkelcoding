"use client";

import { useState, useEffect, useCallback } from "react";

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  syncStatus: "idle" | "syncing" | "error";
}

export function useOffline(): OfflineState {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    pendingCount: 0,
    syncStatus: "idle",
  });

  const updateOnlineStatus = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
    }));
  }, []);

  useEffect(() => {
    setState((prev) => ({ ...prev, isOnline: navigator.onLine }));
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [updateOnlineStatus]);

  return state;
}

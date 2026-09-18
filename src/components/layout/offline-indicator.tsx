"use client";

import { useOffline } from "@/hooks/use-offline";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOffline();

  return (
    <button
      className={cn(
        "flex items-center gap-1.5 text-[12px] font-mono px-3.5 py-1.5",
        "border rounded-full cursor-default",
        isOnline
          ? "border-[#3a4d43] bg-ink-soft text-[#cfe0d6]"
          : "border-[#6b4636] bg-ink-soft text-[#f2ddd0]"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-none",
          isOnline ? "bg-pcb" : "bg-rust animate-pulse-slow"
        )}
      />
      <span>
        {isOnline
          ? pendingCount > 0
            ? `Sinkronisasi (${pendingCount})`
            : "Online"
          : `Offline (${pendingCount} antrian)`}
      </span>
    </button>
  );
}

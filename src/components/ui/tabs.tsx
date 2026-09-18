"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  children: (activeTab: string) => React.ReactNode;
}

export function Tabs({ tabs, defaultTab, onTabChange, children }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id);

  function handleChange(tabId: string) {
    setActive(tabId);
    onTabChange?.(tabId);
  }

  return (
    <div>
      <div className="flex gap-1 mb-5 border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={cn(
              "font-sans text-[13px] font-medium bg-transparent border-none pb-2.5 pt-2.5 mr-5 cursor-pointer",
              "border-b-2 transition-colors",
              active === tab.id
                ? "text-text-primary font-semibold border-b-copper"
                : "text-text-dim border-b-transparent"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="animate-fade-in">{children(active)}</div>
    </div>
  );
}

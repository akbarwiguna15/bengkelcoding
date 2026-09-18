"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  sublabel: string;
  step: number;
}

interface SidebarProps {
  title: string;
  items: NavItem[];
}

export function Sidebar({ title, items }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="w-[210px] flex-none bg-paper border-r border-line py-5">
      <div className="px-5 pb-2.5 text-[11px] text-text-dim uppercase tracking-widest">
        {title}
      </div>
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-start gap-2.5 w-full text-left border-none bg-transparent",
              "font-sans px-5 py-2.5 cursor-pointer text-text-dim text-[13.5px] no-underline",
              "border-l-2 border-l-transparent",
              isActive &&
                "text-text-primary border-l-pcb bg-pcb-soft font-semibold"
            )}
          >
            <span
              className={cn(
                "flex-none w-5 h-5 rounded-full border-[1.5px] border-line",
                "flex items-center justify-center text-[11px] font-mono text-text-dim mt-0.5",
                isActive && "bg-pcb border-pcb text-white"
              )}
            >
              {item.step}
            </span>
            <div>
              {item.label}
              <small className="block font-normal text-text-dim text-[11.5px] mt-0.5">
                {item.sublabel}
              </small>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

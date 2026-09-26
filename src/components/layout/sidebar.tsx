"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

interface SidebarProps {
  items: NavItem[];
  role: "siswa" | "guru";
}

export function Sidebar({ items, role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="w-[210px] flex-none bg-paper border-r border-line py-[18px] px-3.5 flex flex-col gap-1">
      <div className="font-mono font-semibold text-[15px] text-pcb tracking-tight mb-4 px-2.5">
        bengkel<span className="text-text-dim font-normal">kode</span>
      </div>

      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block w-full text-left text-[13px] no-underline",
              "px-2.5 py-[7px] border-l-[2.5px] border-l-transparent",
              "text-text-dim transition-all duration-100",
              isActive &&
                "text-text-primary font-medium border-l-pcb bg-paper-dim"
            )}
          >
            {item.label}
            {item.badge != null && item.badge > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber text-white text-[10px] font-bold px-[5px] ml-1 align-middle animate-pulse-slow">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}

      <div className="mt-auto pt-3 border-t border-line flex gap-1">
        <Link
          href="/siswa/dashboard"
          className={cn(
            "flex-1 text-center text-[11.5px] font-medium no-underline py-1.5 border border-line",
            role === "siswa"
              ? "bg-ink text-white border-ink"
              : "bg-white text-text-primary"
          )}
        >
          Siswa
        </Link>
        <Link
          href="/guru/kelas"
          className={cn(
            "flex-1 text-center text-[11.5px] font-medium no-underline py-1.5 border border-line",
            role === "guru"
              ? "bg-ink text-white border-ink"
              : "bg-white text-text-primary"
          )}
        >
          Guru
        </Link>
      </div>
    </nav>
  );
}

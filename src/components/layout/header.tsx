"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { OfflineIndicator } from "./offline-indicator";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between bg-ink text-paper px-5 py-3.5">
      <Link href="/" className="flex items-center gap-2.5 no-underline text-paper">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <rect x="1" y="1" width="24" height="24" stroke="#c17a3d" strokeWidth="1.4" />
          <path
            d="M8 9L5 13L8 17M18 9L21 13L18 17M14.5 7L11.5 19"
            stroke="#f1eee4"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div>
          <div className="font-semibold text-[15px] tracking-wide">Bengkel Kode</div>
          <div className="text-[11px] text-[#9fb3a8] font-normal">
            Latihan coding — SMK Rekayasa Perangkat Lunak
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-3.5">
        <OfflineIndicator />
        {session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-[#9fb3a8] font-mono">
              {session.user.name} ({session.user.role === "GURU" ? "Guru" : "Siswa"})
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-[12px] text-[#9fb3a8] hover:text-paper bg-transparent border border-[#3a4d43] px-3 py-1.5 font-sans cursor-pointer rounded-full"
            >
              Keluar
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

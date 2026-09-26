"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Providers } from "@/components/providers";

const guruNav = [
  { href: "/guru/kelas", label: "Kelola kelas" },
  { href: "/guru/soal/buat", label: "Buat soal" },
  { href: "/guru/soal", label: "Verifikasi soal" },
  { href: "/guru/dashboard", label: "Rekap nilai", badge: 2 },
];

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="max-w-[1180px] mx-auto bg-paper min-h-screen shadow-[0_0_0_1px_var(--line)]">
        <Header />
        <div className="flex min-h-[calc(100vh-57px)]">
          <Sidebar items={guruNav} role="guru" />
          <main className="flex-1 p-[30px_34px]">{children}</main>
        </div>
      </div>
    </Providers>
  );
}

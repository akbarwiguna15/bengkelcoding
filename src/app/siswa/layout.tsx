"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Providers } from "@/components/providers";

const siswaNav = [
  { href: "/siswa/dashboard", label: "Latihan" },
  { href: "/siswa/riwayat", label: "Hasil" },
];

export default function SiswaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="max-w-[1180px] mx-auto bg-paper min-h-screen shadow-[0_0_0_1px_var(--line)]">
        <Header />
        <div className="flex min-h-[calc(100vh-57px)]">
          <Sidebar items={siswaNav} role="siswa" />
          <main className="flex-1 p-[30px_34px]">{children}</main>
        </div>
      </div>
    </Providers>
  );
}

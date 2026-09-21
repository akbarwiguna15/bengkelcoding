"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Providers } from "@/components/providers";

const guruNav = [
  {
    href: "/guru/kelas",
    label: "Kelola Kelas",
    sublabel: "Buat kelas & import siswa",
    step: 1,
  },
  {
    href: "/guru/soal/buat",
    label: "Buat Soal",
    sublabel: "Pilih model & materi",
    step: 2,
  },
  {
    href: "/guru/soal",
    label: "Verifikasi Soal",
    sublabel: "Tinjau sebelum tayang",
    step: 3,
  },
  {
    href: "/guru/dashboard",
    label: "Rekap Nilai",
    sublabel: "Progres tiap siswa",
    step: 4,
  },
];

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="max-w-[1180px] mx-auto bg-paper min-h-screen shadow-[0_0_0_1px_var(--line)]">
        <Header />
        <div className="flex min-h-[calc(100vh-57px)]">
          <Sidebar title="Alur Guru" items={guruNav} />
          <main className="flex-1 p-[30px_34px]">{children}</main>
        </div>
      </div>
    </Providers>
  );
}

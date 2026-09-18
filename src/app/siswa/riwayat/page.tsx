"use client";

import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function HasilPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-[20px] font-semibold mb-1">Hasil</h1>
      <p className="text-[13.5px] text-text-dim mb-6">
        Bentuk hasil menyesuaikan model pembelajaran soal yang dikerjakan.
      </p>

      <Tabs
        tabs={[
          { id: "ps", label: "Problem Solving" },
          { id: "pbl", label: "Project Based Learning" },
          { id: "tf", label: "Transformatif" },
        ]}
      >
        {(activeTab) => {
          if (activeTab === "ps") return <ProblemSolvingResult />;
          if (activeTab === "pbl") return <PBLResult />;
          return <TransformatifResult />;
        }}
      </Tabs>
    </div>
  );
}

function ProblemSolvingResult() {
  return (
    <div>
      <p className="text-[13.5px] text-text-dim mb-0">
        Navigasi Flexbox — dikoreksi otomatis oleh sistem.
      </p>
      <div className="flex items-center gap-5 my-5">
        <div className="font-mono text-[38px] font-semibold text-pcb">
          85<span className="text-[16px] text-text-dim">/100</span>
        </div>
        <div className="text-[13px] text-text-dim max-w-[360px]">
          2 dari 3 kriteria terpenuhi. Perbaiki bagian yang gagal lalu kirim ulang
          jika ingin memperbaiki nilai.
        </div>
      </div>
      <div className="flex flex-col">
        {[
          { label: "Elemen .navbar memakai display: flex", pass: true },
          { label: "Struktur HTML tidak diubah", pass: true },
          { label: "Menu tersusun rata dengan justify-content: space-between", pass: false },
        ].map((test, i) => (
          <div
            key={i}
            className={cn(
              "flex justify-between items-center px-4 py-3 border-b border-line text-[13px]",
              i === 0 && "border-t"
            )}
          >
            <span>{test.label}</span>
            <span className={cn("font-mono text-[12px] font-semibold", test.pass ? "text-pcb" : "text-rust")}>
              {test.pass ? "LULUS" : "GAGAL"}
            </span>
          </div>
        ))}
      </div>
      <div className="bg-rust-soft border-l-[3px] border-rust px-3.5 py-3 mt-2 text-[12.5px] text-[#7c3a20] leading-relaxed">
        Ditemukan nilai <code className="font-mono">justify-content: flex-start</code> — soal
        meminta menu rata kanan-kiri. Ganti dengan <code className="font-mono">space-between</code>{" "}
        lalu kirim ulang.
      </div>
    </div>
  );
}

function PBLResult() {
  return (
    <div>
      <p className="text-[13.5px] text-text-dim mb-0">
        Galeri Foto Responsif — dinilai bertahap per milestone.
      </p>
      <div className="flex py-5 gap-2 max-w-[420px]">
        <div className="flex-1 text-center">
          <div className="w-6.5 h-6.5 rounded-full bg-pcb border-[1.5px] border-pcb text-white flex items-center justify-center mx-auto mb-1.5 font-mono text-[12px]">✓</div>
          <small className="text-[11px] text-text-dim">Struktur HTML</small>
        </div>
        <div className="flex-1 h-0.5 bg-pcb mt-3" />
        <div className="flex-1 text-center">
          <div className="w-6.5 h-6.5 rounded-full bg-pcb border-[1.5px] border-pcb text-white flex items-center justify-center mx-auto mb-1.5 font-mono text-[12px]">✓</div>
          <small className="text-[11px] text-text-dim">Layout Grid</small>
        </div>
        <div className="flex-1 h-0.5 bg-line mt-3" />
        <div className="flex-1 text-center">
          <div className="w-6.5 h-6.5 rounded-full bg-copper border-[1.5px] border-copper text-white flex items-center justify-center mx-auto mb-1.5 font-mono text-[12px]">3</div>
          <small className="text-[11px] text-text-dim">Responsif</small>
        </div>
      </div>
      <div className="max-w-[520px]">
        {[
          { label: "Tahap 1 — Struktur HTML", status: "DISETUJUI", pass: true },
          { label: "Tahap 2 — Layout Grid", status: "DISETUJUI", pass: true },
          { label: "Tahap 3 — Responsif", status: "MENUNGGU DIKERJAKAN", pass: false },
        ].map((step, i) => (
          <div
            key={i}
            className={cn("flex justify-between items-center px-4 py-3 border-b border-line text-[13px]", i === 0 && "border-t")}
          >
            <span>{step.label}</span>
            <span className={cn("font-mono text-[12px] font-semibold", step.pass ? "text-pcb" : "text-amber")}>
              {step.status}
            </span>
          </div>
        ))}
      </div>
      <div className="border border-dashed border-line p-3 text-[12px] text-text-dim leading-relaxed mt-3 max-w-[520px]">
        Nilai akhir baru muncul setelah semua tahap diselesaikan dan disetujui guru —
        bukan dari satu kali submit.
      </div>
    </div>
  );
}

function TransformatifResult() {
  return (
    <div>
      <p className="text-[13.5px] text-text-dim mb-0">
        Refleksi: Aplikasi Favoritmu — menunggu penilaian guru.
      </p>
      <div className="flex items-center gap-5 my-5">
        <div className="font-mono text-[22px] font-semibold text-reflect">
          Menunggu penilaian guru
        </div>
      </div>
      <div className="border border-line bg-white p-5 max-w-[560px]">
        <h4 className="text-[13.5px] font-semibold mb-1.5">Jawabanmu</h4>
        <p className="text-[12.5px] text-text-dim leading-relaxed">
          Aplikasi yang sering saya pakai adalah aplikasi ojek online. Menurut saya
          bagian yang paling nyaman itu tombol pesan yang besar dan warnanya mencolok,
          jadi gampang ditemukan meski buru-buru...
        </p>
      </div>
      <div className="border border-dashed border-line p-3 text-[12px] text-text-dim leading-relaxed mt-3 max-w-[560px]">
        Guru akan menilai dengan skala:{" "}
        <span className="inline-flex gap-1.5 mx-1">
          <span className="text-[11px] font-mono px-2 py-0.5 bg-white border border-line">Belum mengaitkan</span>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-white border border-line">Cukup mengaitkan</span>
          <span className="text-[11px] font-mono px-2 py-0.5 bg-white border border-line">Mengaitkan dengan baik</span>
        </span>{" "}
        — tidak ada skor angka otomatis untuk soal reflektif.
      </div>
    </div>
  );
}

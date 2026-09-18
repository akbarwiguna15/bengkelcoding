"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

interface DraftSoal {
  id: string;
  learningModel: string;
  topic: string;
  difficulty: string;
  body: string;
  codeBlock?: string;
  rubrik: string;
  status: "pending" | "ok" | "revisi";
}

const demoSoal: DraftSoal[] = [
  {
    id: "1",
    learningModel: "PROBLEM_SOLVING",
    topic: "CSS Layout & Flexbox",
    difficulty: "Menengah",
    body: "Menu navigasi pada situs latihan tampil menumpuk tidak rata. Perbaiki kode Flexbox berikut supaya 4 menu tersusun rata kanan-kiri (space-between), tanpa mengubah struktur HTML.",
    codeBlock: `.navbar {\n  display: flex;\n  justify-content: /* lengkapi */;\n}`,
    rubrik:
      "Dinilai otomatis lewat test-case pass/fail. Tiap kriteria diberi tag konsep supaya bisa masuk ke Pola Kesalahan Kelas.",
    status: "pending",
  },
  {
    id: "2",
    learningModel: "TRANSFORMATIF",
    topic: "JavaScript Dasar",
    difficulty: "Mudah",
    body: 'Ceritakan satu situasi sehari-hari yang melibatkan perhitungan berulang (misal: kasir toko), lalu tulis fungsi hitungTotal(harga, qty) untuk menyelesaikannya.',
    rubrik:
      "Tidak ada skor otomatis — dinilai manual oleh guru memakai skala kualitatif.",
    status: "ok",
  },
  {
    id: "3",
    learningModel: "PBL",
    topic: "DOM & Event",
    difficulty: "Menengah",
    body: "Instruksi soal dinilai kurang jelas pada bagian event listener — dikembalikan untuk diperbaiki sebelum ditayangkan ulang.",
    rubrik:
      "Dinilai bertahap per milestone, siswa lanjut ke tahap berikutnya setelah tahap sebelumnya disetujui.",
    status: "revisi",
  },
];

const modelBadge: Record<string, { variant: "pcb" | "copper" | "reflect"; label: string }> = {
  PROBLEM_SOLVING: { variant: "pcb", label: "Problem Solving" },
  PBL: { variant: "copper", label: "Project Based Learning" },
  TRANSFORMATIF: { variant: "reflect", label: "Transformatif" },
};

export default function VerifikasiSoalPage() {
  const [soalList, setSoalList] = useState(demoSoal);

  function updateStatus(id: string, status: DraftSoal["status"]) {
    setSoalList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-[20px] font-semibold mb-1">Verifikasi soal</h1>
      <p className="text-[13.5px] text-text-dim mb-6 max-w-[520px]">
        Soal baru tampil ke siswa setelah disetujui di sini. Edit langsung jika
        ada bagian yang kurang tepat.
      </p>

      <div className="flex flex-col gap-3.5">
        {soalList.map((soal) => {
          const badge = modelBadge[soal.learningModel];
          return (
            <Card key={soal.id} className="p-[18px_20px]">
              <div className="flex justify-between items-start gap-4 mb-2.5">
                <div className="flex items-center gap-3 text-[11.5px] text-text-dim flex-wrap">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <span>{soal.topic}</span>
                  <span>Sulit: {soal.difficulty}</span>
                </div>
                <StatusBadge
                  variant={soal.status}
                  label={
                    soal.status === "ok"
                      ? "disetujui — tayang"
                      : soal.status === "revisi"
                      ? "perlu revisi"
                      : undefined
                  }
                />
              </div>

              <div className="text-[14px] leading-relaxed mb-3">{soal.body}</div>

              {soal.codeBlock && (
                <pre className="bg-ink text-[#d7e6dd] font-mono text-[12.5px] p-3 mb-3.5 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {soal.codeBlock}
                </pre>
              )}

              <div className="border border-dashed border-line p-3 text-[12px] text-text-dim leading-relaxed mb-3">
                <strong className="text-text-primary">Rubrik:</strong> {soal.rubrik}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="approve"
                  onClick={() => updateStatus(soal.id, "ok")}
                  disabled={soal.status === "ok"}
                >
                  Setujui & tayangkan
                </Button>
                <Button variant="sm">Edit soal</Button>
                <Button
                  variant="reject"
                  onClick={() => updateStatus(soal.id, "revisi")}
                >
                  Tolak
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

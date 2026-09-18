"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface StudentRow {
  id: number;
  name: string;
  done: number;
  total: number;
  avg: number;
  status: "selesai" | "berjalan";
  soalStatus: ("benar" | "salah" | "proses" | "belum")[];
  offlineNote?: string;
  stuckSoal?: { num: number; minutes: number };
}

const demoStudents: StudentRow[] = [
  { id: 1, name: "Ahmad Fauzan", done: 8, total: 10, avg: 82, status: "selesai", soalStatus: ["benar","benar","benar","salah","benar","benar","salah","benar","belum","belum"], offlineNote: "3 jawaban dikerjakan saat offline — baru tersinkron pukul 08:41." },
  { id: 2, name: "Bunga Amelia", done: 10, total: 10, avg: 94, status: "selesai", soalStatus: ["benar","benar","benar","benar","benar","benar","benar","benar","salah","benar"] },
  { id: 3, name: "Candra Wijaya", done: 5, total: 10, avg: 58, status: "berjalan", soalStatus: ["benar","salah","benar","salah","proses","belum","belum","belum","belum","belum"], stuckSoal: { num: 5, minutes: 6 } },
  { id: 4, name: "Dewi Lestari", done: 10, total: 10, avg: 88, status: "selesai", soalStatus: ["benar","benar","benar","benar","salah","benar","benar","benar","benar","benar"] },
  { id: 5, name: "Eko Prasetyo", done: 3, total: 10, avg: 41, status: "berjalan", soalStatus: ["benar","salah","salah","proses","belum","belum","belum","belum","belum","belum"], stuckSoal: { num: 4, minutes: 9 } },
];

const errorPatterns = [
  { rank: 1, label: "justify-content: flex-start", correct: "space-between", count: 14, total: 20 },
  { rank: 2, label: "Lupa display: flex pada .navbar", correct: "", count: 6, total: 20 },
  { rank: 3, label: 'Salah eja (dispay, jastify-content)', correct: "", count: 3, total: 20 },
];

const soalColors: Record<string, string> = {
  benar: "bg-pcb border-pcb text-white",
  salah: "bg-rust border-rust text-white",
  proses: "bg-amber border-amber text-white animate-pulse-slow",
  belum: "bg-white border-line border-dashed text-text-dim",
};

export default function RekapPage() {
  const [openDetail, setOpenDetail] = useState<number | null>(null);

  return (
    <div className="animate-fade-in">
      <h1 className="text-[20px] font-semibold mb-1">Rekap nilai siswa</h1>
      <p className="text-[13.5px] text-text-dim mb-6">
        Kelas XI RPL 2 — Materi: CSS Layout & Flexbox
      </p>

      <Tabs
        tabs={[
          { id: "persiswa", label: "Per Siswa" },
          { id: "pola", label: "Pola Kesalahan Kelas" },
        ]}
      >
        {(activeTab) =>
          activeTab === "persiswa" ? (
            <div>
              <table className="w-full border-collapse text-[13px] bg-white">
                <thead>
                  <tr>
                    <th className="text-left text-[11px] uppercase tracking-wider text-text-dim border-b-[1.5px] border-ink px-3 py-2.5 font-semibold">Nama siswa</th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-text-dim border-b-[1.5px] border-ink px-3 py-2.5 font-semibold">Soal dikerjakan</th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-text-dim border-b-[1.5px] border-ink px-3 py-2.5 font-semibold">Rata-rata nilai</th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-text-dim border-b-[1.5px] border-ink px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {demoStudents.map((s) => (
                    <>
                      <tr
                        key={s.id}
                        onClick={() => setOpenDetail(openDetail === s.id ? null : s.id)}
                        className="cursor-pointer hover:bg-paper-dim"
                      >
                        <td className="px-3 py-2.5 border-b border-line">
                          {s.name}
                          <span className={cn("inline-block ml-2 text-[10px] text-text-dim transition-transform", openDetail === s.id && "rotate-90")}>
                            ▸
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-line">{s.done} / {s.total}</td>
                        <td className="px-3 py-2.5 border-b border-line">
                          <span className="inline-block w-[100px] h-1.5 bg-paper-dim relative align-middle mr-2">
                            <span className="absolute left-0 top-0 bottom-0 bg-pcb" style={{ width: `${s.avg}%` }} />
                          </span>
                          {s.avg}
                        </td>
                        <td className="px-3 py-2.5 border-b border-line">
                          <span className={cn("text-[11px] font-mono", s.status === "selesai" ? "text-pcb" : "text-amber")}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                      {openDetail === s.id && (
                        <tr key={`detail-${s.id}`}>
                          <td colSpan={4} className="p-0 border-b border-line">
                            <div className="bg-paper-dim p-4">
                              {s.offlineNote && (
                                <div className="text-[12px] text-rust mb-3">
                                  {s.offlineNote}
                                </div>
                              )}
                              <div className="flex gap-4 mb-3 flex-wrap text-[11.5px] text-text-dim">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pcb" />Benar</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rust" />Salah</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber" />Sedang dikerjakan</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white border-[1.5px] border-line" />Belum dikerjakan</span>
                              </div>
                              <div className="flex gap-2.5 flex-wrap">
                                {s.soalStatus.map((st, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center font-mono text-[12.5px] font-semibold border-[1.5px]",
                                      soalColors[st]
                                    )}
                                  >
                                    {i + 1}
                                    {s.stuckSoal && s.stuckSoal.num === i + 1 && (
                                      <span className="absolute -top-2 -right-1.5 bg-ink text-paper text-[8.5px] font-mono px-1 leading-tight">
                                        {s.stuckSoal.minutes}m
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <p className="text-[13.5px] text-text-dim mb-4 max-w-[520px]">
                Diagregasi dari kesalahan tiap siswa pada soal{" "}
                <strong>Navigasi Flexbox</strong> — bukan siapa yang salah, tapi
                konsep apa yang paling sering salah.
              </p>
              {errorPatterns.map((p) => (
                <div
                  key={p.rank}
                  className="grid grid-cols-[1fr_90px_140px] items-center gap-3.5 px-4 py-3.5 border-b border-line bg-white first:border-t"
                >
                  <div>
                    <span className="block font-mono text-[11px] text-text-dim mb-0.5">
                      #{p.rank}{p.rank === 1 ? " · paling sering" : ""}
                    </span>
                    <span className="text-[13.5px]">
                      {p.label.includes("flex-start") ? (
                        <>Menulis <span className="font-mono text-[12px] text-rust">{p.label}</span> padahal seharusnya <span className="font-mono text-[12px] text-rust">{p.correct}</span></>
                      ) : (
                        p.label
                      )}
                    </span>
                  </div>
                  <span className="font-mono text-[12.5px] text-text-dim text-right">
                    {p.count} / {p.total} siswa
                  </span>
                  <div className="h-2 bg-paper-dim relative">
                    <span
                      className={cn("absolute left-0 top-0 bottom-0", p.rank === 1 ? "bg-rust" : p.rank === 2 ? "bg-amber" : "bg-pcb")}
                      style={{ width: `${(p.count / p.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="bg-pcb-soft border-l-[3px] border-pcb p-3.5 mt-4 text-[12.5px] leading-relaxed text-[#1e3a2c]">
                <strong>70% kelas</strong> salah di konsep yang sama (
                <code className="font-mono">justify-content</code>). Ini kemungkinan
                besar soal cara penjelasan konsep, bukan soal siswa kurang belajar —
                pertimbangkan mengulang bagian ini sebelum lanjut ke materi berikutnya.
              </div>
            </div>
          )
        }
      </Tabs>
    </div>
  );
}

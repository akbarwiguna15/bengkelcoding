"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface PriorityData {
  fail: number;
  repeat: number;
  df: "Mudah" | "Menengah" | "Sulit";
  helped: boolean;
  timeLeft: number | null;
}

interface StudentRow {
  id: number;
  name: string;
  done: number;
  total: number;
  avg: number;
  status: "selesai" | "berjalan";
  soalStatus: ("benar" | "salah" | "proses" | "belum")[];
  hand: boolean;
  hp: PriorityData;
  live?: boolean;
  liveMin?: number;
  offlineNote?: string;
}

function calcPrio(s: StudentRow): number {
  if (!s.hand || !s.hp) return 0;
  const p = s.hp;
  let sc = 0;
  sc += Math.min(p.repeat * 6, 30);
  sc += Math.min(p.fail * 2.5, 20);
  sc += p.df === "Mudah" ? 20 : p.df === "Menengah" ? 10 : 0;
  if (p.helped) sc += 15;
  sc += Math.max(0, Math.round((100 - s.avg) / 10));
  if (p.timeLeft != null) {
    if (p.timeLeft <= 10) sc += 15;
    else if (p.timeLeft <= 20) sc += 10;
    else if (p.timeLeft <= 40) sc += 5;
  }
  return Math.min(sc, 100);
}

function prioTag(score: number): { label: string; color: string; bg: string } {
  if (score >= 60) return { label: "Urgent", color: "text-rust", bg: "bg-rust-soft border-rust" };
  if (score >= 35) return { label: "Tinggi", color: "text-amber", bg: "bg-amber-soft border-amber" };
  return { label: "Sedang", color: "text-text-dim", bg: "bg-paper-dim border-line" };
}

const demoStudents: StudentRow[] = [
  {
    id: 1, name: "Ahmad Fauzan", done: 8, total: 10, avg: 82, status: "selesai",
    soalStatus: ["benar","benar","benar","benar","benar","benar","salah","benar","belum","belum"],
    hand: false, hp: { fail: 0, repeat: 0, df: "Menengah", helped: false, timeLeft: null },
    offlineNote: "3 jawaban dikerjakan saat offline — baru tersinkron pukul 08:41.",
  },
  {
    id: 2, name: "Bunga Amelia", done: 10, total: 10, avg: 94, status: "selesai",
    soalStatus: ["benar","benar","benar","benar","benar","benar","benar","benar","salah","benar"],
    hand: false, hp: { fail: 0, repeat: 0, df: "Menengah", helped: false, timeLeft: null },
  },
  {
    id: 3, name: "Candra Wijaya", done: 5, total: 10, avg: 58, status: "berjalan",
    soalStatus: ["benar","benar","benar","benar","proses","belum","belum","belum","belum","belum"],
    hand: true, hp: { fail: 8, repeat: 5, df: "Menengah", helped: true, timeLeft: 14 },
    live: true, liveMin: 56,
  },
  {
    id: 4, name: "Dewi Lestari", done: 10, total: 10, avg: 88, status: "selesai",
    soalStatus: ["benar","benar","benar","benar","salah","benar","benar","benar","benar","benar"],
    hand: false, hp: { fail: 0, repeat: 0, df: "Menengah", helped: false, timeLeft: null },
  },
  {
    id: 5, name: "Eko Prasetyo", done: 3, total: 10, avg: 41, status: "berjalan",
    soalStatus: ["benar","salah","salah","proses","belum","belum","belum","belum","belum","belum"],
    hand: true, hp: { fail: 3, repeat: 1, df: "Mudah", helped: false, timeLeft: 52 },
    live: true, liveMin: 12,
  },
];

const errorPatterns = [
  { soal: "Soal 5 — Flexbox justify-content", salah: 12, total: 28, pct: 43, hint: "Banyak siswa menulis flex-start, bukan space-between." },
  { soal: "Soal 9 — Event listener", salah: 8, total: 28, pct: 29, hint: "Salah menerapkan addEventListener — sering lupa parameter kedua." },
  { soal: "Soal 7 — CSS Grid template", salah: 6, total: 28, pct: 21, hint: "Siswa keliru antara grid-template-columns dan grid-template-rows." },
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
        Kelas XI RPL 2 — Materi: HTML dan CSS
      </p>

      <Tabs
        tabs={[
          { id: "persiswa", label: "Per Siswa" },
          { id: "pola", label: "Pola Kesalahan Kelas" },
        ]}
      >
        {(activeTab) =>
          activeTab === "persiswa" ? (
            <div className="border border-line">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1.6fr_.7fr_.8fr] px-4 py-2.5 text-[11px] uppercase tracking-widest text-text-dim font-semibold bg-paper-dim border-b border-line">
                <span>Nama</span>
                <span>Soal</span>
                <span>Rata-rata</span>
                <span>Waktu</span>
                <span>Status</span>
              </div>

              {/* Student rows */}
              {demoStudents.map((s) => {
                const isOpen = openDetail === s.id;
                const prio = s.hand ? calcPrio(s) : 0;
                const pt = s.hand ? prioTag(prio) : null;

                return (
                  <div key={s.id} className="border-b border-line">
                    {/* Row */}
                    <div
                      className="grid grid-cols-[2fr_1fr_1.6fr_.7fr_.8fr] px-4 py-3 text-[13.5px] cursor-pointer items-center hover:bg-paper-dim/50"
                      onClick={() => setOpenDetail(isOpen ? null : s.id)}
                    >
                      {/* Name + priority badge */}
                      <span className="flex items-center gap-1.5">
                        {s.name}
                        {s.hand && pt && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 border animate-pulse-slow whitespace-nowrap",
                              pt.bg, pt.color
                            )}
                          >
                            &#9995; {pt.label}
                          </span>
                        )}
                        <span className={cn(
                          "text-[11px] text-text-dim transition-transform",
                          isOpen && "rotate-90"
                        )}>
                          &#9656;
                        </span>
                      </span>

                      {/* Soal done */}
                      <span className="font-mono text-[13px]">
                        {s.done}/{s.total}
                      </span>

                      {/* Average with bar */}
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-[90px] h-2 bg-paper-dim rounded overflow-hidden">
                          <span
                            className="block h-full bg-pcb rounded"
                            style={{ width: `${Math.round(s.avg * 0.9)}%` }}
                          />
                        </span>
                        <span className="font-mono text-[13px] font-medium">{s.avg}</span>
                      </span>

                      {/* Time remaining */}
                      <span className={cn(
                        "font-mono text-[12.5px]",
                        s.hp.timeLeft != null && s.hp.timeLeft <= 15
                          ? "text-rust"
                          : "text-text-dim"
                      )}>
                        {s.hp.timeLeft != null ? `${s.hp.timeLeft}m` : "—"}
                      </span>

                      {/* Status */}
                      <span className={cn(
                        "text-[12.5px] font-mono",
                        s.status === "selesai" ? "text-pcb" : "text-amber"
                      )}>
                        {s.status}
                      </span>
                    </div>

                    {/* Detail panel */}
                    {isOpen && (
                      <div className="bg-paper-dim p-4 border-t border-line">
                        {s.offlineNote && (
                          <div className="text-[12px] text-rust mb-3">
                            {s.offlineNote}
                          </div>
                        )}

                        {s.live && (
                          <div className="text-[12.5px] text-text-dim mb-3">
                            Diperbarui real-time — sedang dikerjakan.
                          </div>
                        )}

                        {s.hand && (
                          <div className="bg-amber-soft border border-amber px-3 py-2 mb-3 text-[12.5px] text-amber flex items-center gap-2">
                            <span className="text-[16px]">&#9995;</span>
                            Siswa mengangkat tangan — klik soal untuk membantu.
                          </div>
                        )}

                        {/* Legend */}
                        <div className="flex gap-4 mb-3 flex-wrap text-[11.5px] text-text-dim">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-pcb" />Benar
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rust" />Salah
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber" />Sedang dikerjakan
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-white border-[1.5px] border-line" />Belum dikerjakan
                          </span>
                        </div>

                        {/* Soal circles */}
                        <div className="flex gap-2.5 flex-wrap">
                          {s.soalStatus.map((st, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center font-mono text-[12.5px] font-semibold border-[1.5px] relative",
                                soalColors[st],
                                st === "proses" && s.live && "cursor-pointer"
                              )}
                            >
                              {st === "proses" && s.liveMin ? (
                                <span className="text-[11px]">{s.liveMin}m</span>
                              ) : (
                                i + 1
                              )}
                              {st === "proses" && s.hand && (
                                <span className="absolute -top-1.5 -right-1.5 text-[14px] animate-pulse-slow drop-shadow-sm">
                                  &#9995;
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Pola Kesalahan Kelas tab */
            <div className="flex flex-col gap-3">
              {errorPatterns.map((p, i) => (
                <div key={i} className="border border-line bg-white p-[18px]">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-[14px]">{p.soal}</span>
                    <span className="font-mono text-[13px] text-rust font-semibold">
                      {p.pct}% salah
                    </span>
                  </div>
                  <div className="w-full h-2 bg-paper-dim rounded overflow-hidden mb-2">
                    <div
                      className="h-full bg-rust rounded"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <div className="text-[12.5px] text-text-dim">
                    {p.salah} dari {p.total} siswa salah — {p.hint}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Tabs>
    </div>
  );
}

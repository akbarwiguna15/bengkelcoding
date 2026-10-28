"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────── */

type SoalModel = "PROBLEM_SOLVING" | "PBL" | "TRANSFORMATIF" | "DEEP_LEARNING";

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

interface HintItem {
  text: string;
  revealed: boolean;
  response: "paham" | "lagi" | null;
}

interface HintPanelState {
  studentName: string;
  soalNum: number;
}

/* ─── Model configuration ──────────────────────────────────── */

const MODEL_TABS: { id: SoalModel; label: string }[] = [
  { id: "PROBLEM_SOLVING", label: "Problem Solving" },
  { id: "PBL", label: "Project Based Learning" },
  { id: "TRANSFORMATIF", label: "Transformatif" },
  { id: "DEEP_LEARNING", label: "Deep Learning" },
];

const soalModels: SoalModel[] = [
  "PROBLEM_SOLVING", "PROBLEM_SOLVING", "PROBLEM_SOLVING", "PBL",
  "PROBLEM_SOLVING", "PBL", "PROBLEM_SOLVING", "TRANSFORMATIF",
  "PROBLEM_SOLVING", "DEEP_LEARNING",
];

const modelCounts: Record<SoalModel, number> = {
  PROBLEM_SOLVING: 0, PBL: 0, TRANSFORMATIF: 0, DEEP_LEARNING: 0,
};
soalModels.forEach((m) => modelCounts[m]++);

const modelSoalIndices: Record<SoalModel, number[]> = {
  PROBLEM_SOLVING: [], PBL: [], TRANSFORMATIF: [], DEEP_LEARNING: [],
};
soalModels.forEach((m, i) => modelSoalIndices[m].push(i));

function getInitialModel(): SoalModel {
  const nonZero = MODEL_TABS.filter((t) => modelCounts[t.id] > 0);
  if (nonZero.length === 1) return nonZero[0].id;
  let best = nonZero[0];
  for (const t of nonZero) {
    if (modelCounts[t.id] > modelCounts[best.id]) best = t;
  }
  return best.id;
}

/* ─── PS helpers ─────────────────────────────────────────────── */

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

function getPSStats(s: StudentRow) {
  const indices = modelSoalIndices.PROBLEM_SOLVING;
  const statuses = indices.map((i) => s.soalStatus[i]);
  const done = statuses.filter((st) => st === "benar" || st === "salah").length;
  const benar = statuses.filter((st) => st === "benar").length;
  const avg = done > 0 ? Math.round((benar / done) * 100) : 0;
  return { done, total: indices.length, avg };
}

/* ─── Demo data ──────────────────────────────────────────────── */

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

const pblMilestones = ["Perencanaan", "Riset", "Wireframe", "Implementasi", "Presentasi"];

const pblData: Record<number, {
  reached: number;
  total: number;
  lastApproved: string;
  status: "berjalan" | "selesai" | "revisi";
}> = {
  1: { reached: 4, total: 5, lastApproved: "Wireframe", status: "berjalan" },
  2: { reached: 5, total: 5, lastApproved: "Presentasi", status: "selesai" },
  3: { reached: 2, total: 5, lastApproved: "Riset", status: "berjalan" },
  4: { reached: 5, total: 5, lastApproved: "Presentasi", status: "selesai" },
  5: { reached: 1, total: 5, lastApproved: "Perencanaan", status: "revisi" },
};

const trfData: Record<number, {
  refleksiSent: number;
  refleksiTotal: number;
  penilaian: "menunggu" | "dinilai";
  nilaiRubrik: number | null;
}> = {
  1: { refleksiSent: 1, refleksiTotal: 1, penilaian: "dinilai", nilaiRubrik: 82 },
  2: { refleksiSent: 1, refleksiTotal: 1, penilaian: "dinilai", nilaiRubrik: 91 },
  3: { refleksiSent: 0, refleksiTotal: 1, penilaian: "menunggu", nilaiRubrik: null },
  4: { refleksiSent: 1, refleksiTotal: 1, penilaian: "dinilai", nilaiRubrik: 87 },
  5: { refleksiSent: 1, refleksiTotal: 1, penilaian: "menunggu", nilaiRubrik: null },
};

const dlLayers = ["Memahami", "Menganalisis", "Mengevaluasi", "Mencipta"];

const dlData: Record<number, {
  lapisan: string;
  skor: (number | null)[];
  total: number | null;
}> = {
  1: { lapisan: "Mengevaluasi", skor: [85, 78, 72, null], total: null },
  2: { lapisan: "Mencipta", skor: [92, 88, 85, 90], total: 89 },
  3: { lapisan: "Memahami", skor: [55, null, null, null], total: null },
  4: { lapisan: "Mengevaluasi", skor: [90, 82, 78, null], total: null },
  5: { lapisan: "Memahami", skor: [40, null, null, null], total: null },
};

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

const demoCodeLines = [
  ".navbar {",
  "  display: flex;",
  "  justify-content: flex-start;",
  "  align-items: center;",
  "  gap: 10px;",
  "  padding: 0 16px;",
  "}",
];

/* ─── HintPanel ──────────────────────────────────────────────── */

function HintPanel({
  studentName,
  soalNum,
  onClose,
}: {
  studentName: string;
  soalNum: number;
  onClose: () => void;
}) {
  const [spotLines, setSpotLines] = useState<number[]>([]);
  const [hints, setHints] = useState<HintItem[]>([
    { text: "Perhatikan properti justify-content. Nilai apa yang membuat item tersebar rata?", revealed: true, response: "paham" },
    { text: "Coba baca dokumentasi tentang space-between vs flex-start.", revealed: false, response: null },
  ]);
  const [hintDraft, setHintDraft] = useState("");

  function toggleSpot(line: number) {
    setSpotLines((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line]
    );
  }

  function addHint() {
    const t = hintDraft.trim();
    if (!t) return;
    setHints((prev) => [...prev, { text: t, revealed: false, response: null }]);
    setHintDraft("");
  }

  function demoReveal() {
    setHints((prev) => {
      const next = [...prev];
      for (let i = 0; i < next.length; i++) {
        if (!next[i].revealed) {
          next[i] = { ...next[i], revealed: true };
          break;
        }
      }
      return next;
    });
  }

  function demoRespond() {
    setHints((prev) => {
      const next = [...prev];
      for (let i = 0; i < next.length; i++) {
        if (next[i].revealed && !next[i].response) {
          next[i] = { ...next[i], response: Math.random() > 0.3 ? "paham" : "lagi" };
          break;
        }
      }
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-paper w-full max-w-[620px] mx-4 p-6 border border-line shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-[16px] font-semibold">
            Bantuan untuk {studentName}
          </h2>
          <button
            className="text-[11px] px-2.5 py-1 border border-line bg-white text-text-primary hover:bg-paper-dim"
            onClick={onClose}
          >
            &#10005; Tutup
          </button>
        </div>

        <div className="text-[12.5px] text-text-dim mb-3.5">
          Soal {soalNum} — Navigasi Flexbox &middot;{" "}
          <span className="font-mono text-[11px] bg-amber-soft text-amber px-1.5 py-px">
            sedang dikerjakan
          </span>
        </div>

        <div className="text-[12px] font-semibold mb-1.5 flex items-center gap-1.5">
          Kode siswa saat ini{" "}
          <span className="text-[10px] font-normal text-text-dim">
            (klik baris untuk sorot)
          </span>
        </div>

        <div className="border border-line bg-ink mb-4">
          {demoCodeLines.map((line, i) => {
            const isSpot = spotLines.includes(i);
            return (
              <div
                key={i}
                className={cn(
                  "flex items-baseline px-4 py-[3px] cursor-pointer transition-colors duration-150",
                  isSpot ? "bg-amber/20" : "hover:bg-white/5"
                )}
                onClick={() => toggleSpot(i)}
              >
                <span className="w-6 text-right mr-3 text-[11px] text-text-dim/50 select-none font-mono">
                  {i + 1}
                </span>
                <span className="font-mono text-[12.5px] text-paper">
                  {line}
                </span>
              </div>
            );
          })}
        </div>

        {spotLines.length > 0 && (
          <div className="text-[11.5px] text-amber mb-3.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber inline-block" />
            {spotLines.length} baris disorot — siswa melihat highlight di editor mereka
          </div>
        )}

        <div className="text-[12px] font-semibold mb-2">Petunjuk bertahap</div>
        <div className="text-[11.5px] text-text-dim mb-2.5">
          Siswa membuka hint satu per satu. Hint berikutnya terkunci sampai
          sebelumnya ditandai.
        </div>

        <div className="flex flex-col gap-2 mb-3.5">
          {hints.map((h, i) => {
            const locked = i > 0 && !hints[i - 1].revealed;
            return (
              <div
                key={i}
                className={cn(
                  "flex gap-2.5 p-3 border border-line text-[12.5px]",
                  locked ? "opacity-40 bg-paper-dim" : "bg-white"
                )}
              >
                <span className="w-6 h-6 rounded-full bg-pcb text-white text-[11px] font-bold flex items-center justify-center flex-none">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="leading-relaxed">{h.text}</div>
                  {h.response && (
                    <div className="mt-1.5 text-[12px] px-2 py-1 border border-line bg-paper-dim text-text-dim inline-block">
                      {h.response === "paham"
                        ? "✓ Siswa: Sudah paham"
                        : "❓ Siswa: Butuh lagi"}
                    </div>
                  )}
                  {!h.response && h.revealed && (
                    <div className="mt-1.5 text-[11px] text-text-dim italic">
                      Dibuka siswa — menunggu respon...
                    </div>
                  )}
                  {!h.response && !h.revealed && !locked && (
                    <div className="mt-1.5 text-[11px] text-text-dim">
                      Belum dibuka
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 items-end mb-4">
          <div className="flex-1">
            <label className="text-[12px] font-semibold block mb-1">
              Tambah hint baru
            </label>
            <input
              type="text"
              placeholder="Tulis petunjuk untuk siswa..."
              className="w-full border border-line bg-white px-3 py-2 text-[13px] text-text-primary"
              value={hintDraft}
              onChange={(e) => setHintDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addHint();
              }}
            />
          </div>
          <button
            className="px-4 py-2 bg-pcb text-white text-[13px] font-medium whitespace-nowrap hover:opacity-90"
            onClick={addHint}
          >
            Kirim hint
          </button>
        </div>

        <div className="border-t border-line pt-3 text-[11.5px] text-text-dim flex gap-3 flex-wrap">
          <button
            className="px-2.5 py-1 border border-line bg-white text-text-primary text-[11px] hover:bg-paper-dim"
            onClick={demoReveal}
          >
            Demo: siswa buka hint
          </button>
          <button
            className="px-2.5 py-1 border border-line bg-white text-text-primary text-[11px] hover:bg-paper-dim"
            onClick={demoRespond}
          >
            Demo: siswa respon
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */

export default function RekapPage() {
  const [activeModel, setActiveModel] = useState<SoalModel>(getInitialModel);
  const [openDetail, setOpenDetail] = useState<number | null>(null);
  const [hintPanel, setHintPanel] = useState<HintPanelState | null>(null);

  function handleModelChange(model: SoalModel) {
    if (modelCounts[model] === 0) return;
    setActiveModel(model);
    setOpenDetail(null);
  }

  const innerTabs =
    activeModel === "TRANSFORMATIF"
      ? [{ id: "persiswa", label: "Per Siswa" }]
      : [
          { id: "persiswa", label: "Per Siswa" },
          { id: "pola", label: "Pola Kesalahan Kelas" },
        ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-[20px] font-semibold mb-1">Rekap nilai siswa</h1>
      <p className="text-[13.5px] text-text-dim mb-5">
        Kelas X RPL 2 — Materi: HTML dan CSS
      </p>

      {/* ── Model selector tabs ────────────────────────────────── */}
      <div className="flex gap-1 mb-5 border-b border-line overflow-x-auto">
        {MODEL_TABS.map((tab) => {
          const count = modelCounts[tab.id];
          const disabled = count === 0;
          const isActive = activeModel === tab.id;
          return (
            <button
              key={tab.id}
              disabled={disabled}
              onClick={() => handleModelChange(tab.id)}
              className={cn(
                "font-sans text-[13px] font-medium bg-transparent border-none pb-2.5 pt-2.5 mr-3 whitespace-nowrap",
                "border-b-2 transition-colors",
                disabled
                  ? "text-text-dim/40 border-b-transparent cursor-not-allowed"
                  : isActive
                    ? "text-text-primary font-semibold border-b-copper cursor-pointer"
                    : "text-text-dim border-b-transparent cursor-pointer hover:text-text-primary"
              )}
            >
              {tab.label}{" "}
              <span
                className={cn(
                  "font-mono text-[12px]",
                  disabled ? "text-text-dim/30" : isActive ? "text-copper" : "text-text-dim"
                )}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Inner tabs: Per Siswa / Pola Kesalahan ─────────────── */}
      <Tabs key={activeModel} tabs={innerTabs}>
        {(innerTab) =>
          innerTab === "persiswa" ? (
            <div className="border border-line overflow-x-auto">
              {/* ── Table header — per model ──────────────────── */}
              {activeModel === "PROBLEM_SOLVING" && (
                <div className="grid grid-cols-[2fr_1fr_1.6fr_.7fr_.8fr] min-w-[580px] px-4 py-2.5 text-[11px] uppercase tracking-widest text-text-dim font-semibold bg-paper-dim border-b border-line">
                  <span>Nama</span>
                  <span>Soal dikerjakan</span>
                  <span>Rata-rata nilai</span>
                  <span>Lama di soal</span>
                  <span>Status</span>
                </div>
              )}
              {activeModel === "PBL" && (
                <div className="grid grid-cols-[2fr_1fr_1.5fr_.8fr] min-w-[520px] px-4 py-2.5 text-[11px] uppercase tracking-widest text-text-dim font-semibold bg-paper-dim border-b border-line">
                  <span>Nama</span>
                  <span>Tahap tercapai</span>
                  <span>Terakhir disetujui</span>
                  <span>Status</span>
                </div>
              )}
              {activeModel === "TRANSFORMATIF" && (
                <div className="grid grid-cols-[2fr_1fr_1.2fr_1fr] min-w-[520px] px-4 py-2.5 text-[11px] uppercase tracking-widest text-text-dim font-semibold bg-paper-dim border-b border-line">
                  <span>Nama</span>
                  <span>Refleksi terkirim</span>
                  <span>Status penilaian</span>
                  <span>Nilai rubrik</span>
                </div>
              )}
              {activeModel === "DEEP_LEARNING" && (
                <div className="grid grid-cols-[2fr_1.2fr_2fr_.6fr] min-w-[580px] px-4 py-2.5 text-[11px] uppercase tracking-widest text-text-dim font-semibold bg-paper-dim border-b border-line">
                  <span>Nama</span>
                  <span>Lapisan tercapai</span>
                  <span>Skor per lapisan</span>
                  <span>Total</span>
                </div>
              )}

              {/* ── Student rows ──────────────────────────────── */}
              {demoStudents.map((s) => {
                const isOpen = openDetail === s.id;
                const prio = s.hand ? calcPrio(s) : 0;
                const pt = s.hand ? prioTag(prio) : null;

                return (
                  <div key={s.id} className="border-b border-line">
                    {/* ── PS row ──────────────────────────────── */}
                    {activeModel === "PROBLEM_SOLVING" &&
                      (() => {
                        const ps = getPSStats(s);
                        return (
                          <div
                            className="grid grid-cols-[2fr_1fr_1.6fr_.7fr_.8fr] min-w-[580px] px-4 py-3 text-[13.5px] cursor-pointer items-center hover:bg-paper-dim/50"
                            onClick={() => setOpenDetail(isOpen ? null : s.id)}
                          >
                            <span className="flex items-center gap-1.5">
                              {s.name}
                              {s.hand && (
                                <span className="text-[14px]">&#9995;</span>
                              )}
                              {s.hand && pt && (
                                <span
                                  className={cn(
                                    "text-[10px] font-semibold px-1.5 py-0.5 border whitespace-nowrap",
                                    pt.bg,
                                    pt.color
                                  )}
                                >
                                  {pt.label}
                                </span>
                              )}
                              <span
                                className={cn(
                                  "text-[11px] text-text-dim transition-transform",
                                  isOpen && "rotate-90"
                                )}
                              >
                                &#9656;
                              </span>
                            </span>
                            <span className="font-mono text-[13px]">
                              {ps.done}/{ps.total}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="inline-block w-[90px] h-2 bg-paper-dim rounded overflow-hidden">
                                <span
                                  className="block h-full bg-pcb rounded"
                                  style={{ width: `${Math.round(ps.avg * 0.9)}%` }}
                                />
                              </span>
                              <span className="font-mono text-[13px] font-medium">
                                {ps.avg}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "font-mono text-[12.5px]",
                                s.hp.timeLeft != null && s.hp.timeLeft <= 15
                                  ? "text-rust"
                                  : "text-text-dim"
                              )}
                            >
                              {s.hp.timeLeft != null ? `${s.hp.timeLeft}m` : "—"}
                            </span>
                            <span
                              className={cn(
                                "text-[12.5px] font-mono",
                                s.status === "selesai" ? "text-pcb" : "text-amber"
                              )}
                            >
                              {s.status}
                            </span>
                          </div>
                        );
                      })()}

                    {/* ── PBL row ─────────────────────────────── */}
                    {activeModel === "PBL" &&
                      (() => {
                        const d = pblData[s.id];
                        return (
                          <div
                            className="grid grid-cols-[2fr_1fr_1.5fr_.8fr] min-w-[520px] px-4 py-3 text-[13.5px] cursor-pointer items-center hover:bg-paper-dim/50"
                            onClick={() => setOpenDetail(isOpen ? null : s.id)}
                          >
                            <span className="flex items-center gap-1.5">
                              {s.name}
                              {s.hand && (
                                <span className="text-[14px]">&#9995;</span>
                              )}
                              <span
                                className={cn(
                                  "text-[11px] text-text-dim transition-transform",
                                  isOpen && "rotate-90"
                                )}
                              >
                                &#9656;
                              </span>
                            </span>
                            <span className="font-mono text-[13px]">
                              {d.reached}/{d.total}
                            </span>
                            <span className="text-[13px]">{d.lastApproved}</span>
                            <span
                              className={cn(
                                "text-[12.5px] font-mono",
                                d.status === "selesai"
                                  ? "text-pcb"
                                  : d.status === "revisi"
                                    ? "text-rust"
                                    : "text-amber"
                              )}
                            >
                              {d.status}
                            </span>
                          </div>
                        );
                      })()}

                    {/* ── TRF row ─────────────────────────────── */}
                    {activeModel === "TRANSFORMATIF" &&
                      (() => {
                        const d = trfData[s.id];
                        return (
                          <div
                            className="grid grid-cols-[2fr_1fr_1.2fr_1fr] min-w-[520px] px-4 py-3 text-[13.5px] cursor-pointer items-center hover:bg-paper-dim/50"
                            onClick={() => setOpenDetail(isOpen ? null : s.id)}
                          >
                            <span className="flex items-center gap-1.5">
                              {s.name}
                              {s.hand && (
                                <span className="text-[14px]">&#9995;</span>
                              )}
                              <span
                                className={cn(
                                  "text-[11px] text-text-dim transition-transform",
                                  isOpen && "rotate-90"
                                )}
                              >
                                &#9656;
                              </span>
                            </span>
                            <span className="font-mono text-[13px]">
                              {d.refleksiSent}/{d.refleksiTotal}
                            </span>
                            <span
                              className={cn(
                                "text-[12.5px] font-mono",
                                d.penilaian === "dinilai" ? "text-pcb" : "text-amber"
                              )}
                            >
                              {d.penilaian}
                            </span>
                            <span className="font-mono text-[13px] font-medium">
                              {d.nilaiRubrik != null ? d.nilaiRubrik : "—"}
                            </span>
                          </div>
                        );
                      })()}

                    {/* ── DL row ──────────────────────────────── */}
                    {activeModel === "DEEP_LEARNING" &&
                      (() => {
                        const d = dlData[s.id];
                        return (
                          <div
                            className="grid grid-cols-[2fr_1.2fr_2fr_.6fr] min-w-[580px] px-4 py-3 text-[13.5px] cursor-pointer items-center hover:bg-paper-dim/50"
                            onClick={() => setOpenDetail(isOpen ? null : s.id)}
                          >
                            <span className="flex items-center gap-1.5">
                              {s.name}
                              {s.hand && (
                                <span className="text-[14px]">&#9995;</span>
                              )}
                              <span
                                className={cn(
                                  "text-[11px] text-text-dim transition-transform",
                                  isOpen && "rotate-90"
                                )}
                              >
                                &#9656;
                              </span>
                            </span>
                            <span className="text-[13px]">{d.lapisan}</span>
                            <span className="flex gap-1.5 font-mono text-[12px]">
                              {d.skor.map((v, i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    "px-1.5 py-0.5 border",
                                    v != null
                                      ? "border-line bg-white"
                                      : "border-transparent text-text-dim"
                                  )}
                                >
                                  {v != null ? v : "—"}
                                </span>
                              ))}
                            </span>
                            <span className="font-mono text-[13px] font-medium">
                              {d.total != null ? d.total : "—"}
                            </span>
                          </div>
                        );
                      })()}

                    {/* ── PS detail panel ─────────────────────── */}
                    {isOpen && activeModel === "PROBLEM_SOLVING" && (
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
                        <div className="flex gap-4 mb-3 flex-wrap text-[11.5px] text-text-dim">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-pcb" />
                            Benar
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rust" />
                            Salah
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber" />
                            Sedang dikerjakan
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-white border-[1.5px] border-line" />
                            Belum dikerjakan
                          </span>
                        </div>
                        <div className="flex gap-2.5 flex-wrap">
                          {modelSoalIndices.PROBLEM_SOLVING.map((idx) => {
                            const st = s.soalStatus[idx];
                            const soalNum = idx + 1;
                            const isActive = st === "proses";
                            const isClickable = isActive && s.live;
                            return (
                              <div
                                key={idx}
                                className="flex flex-col items-center gap-1"
                              >
                                <div
                                  className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center font-mono text-[12.5px] font-semibold border-[1.5px]",
                                    soalColors[st],
                                    isClickable &&
                                      "cursor-pointer hover:ring-2 hover:ring-amber/50"
                                  )}
                                  onClick={(e) => {
                                    if (isClickable) {
                                      e.stopPropagation();
                                      setHintPanel({
                                        studentName: s.name,
                                        soalNum,
                                      });
                                    }
                                  }}
                                >
                                  {isActive && s.liveMin ? (
                                    <span className="text-[11px]">
                                      {s.liveMin}m
                                    </span>
                                  ) : (
                                    soalNum
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── PBL detail panel ────────────────────── */}
                    {isOpen &&
                      activeModel === "PBL" &&
                      (() => {
                        const d = pblData[s.id];
                        return (
                          <div className="bg-paper-dim p-4 border-t border-line">
                            {s.hand && (
                              <div className="bg-amber-soft border border-amber px-3 py-2 mb-3 text-[12.5px] text-amber flex items-center gap-2">
                                <span className="text-[16px]">&#9995;</span>
                                Siswa mengangkat tangan.
                              </div>
                            )}
                            <div className="text-[12px] font-semibold mb-2">
                              Progres milestone
                            </div>
                            <div className="flex gap-1.5 items-center flex-wrap">
                              {pblMilestones.map((m, i) => {
                                const done = i < d.reached;
                                const current =
                                  i === d.reached && d.reached < d.total;
                                return (
                                  <div
                                    key={i}
                                    className="flex items-center gap-1.5"
                                  >
                                    {i > 0 && (
                                      <span className="text-text-dim/50 text-[10px]">
                                        &rarr;
                                      </span>
                                    )}
                                    <span
                                      className={cn(
                                        "text-[11.5px] px-2 py-1 border",
                                        done
                                          ? "bg-pcb/10 border-pcb text-pcb"
                                          : current
                                            ? "bg-amber/10 border-amber text-amber"
                                            : "bg-paper border-line text-text-dim"
                                      )}
                                    >
                                      {done ? "✓" : current ? "●" : "○"} {m}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                    {/* ── TRF detail panel ────────────────────── */}
                    {isOpen &&
                      activeModel === "TRANSFORMATIF" &&
                      (() => {
                        const d = trfData[s.id];
                        return (
                          <div className="bg-paper-dim p-4 border-t border-line">
                            {s.hand && (
                              <div className="bg-amber-soft border border-amber px-3 py-2 mb-3 text-[12.5px] text-amber flex items-center gap-2">
                                <span className="text-[16px]">&#9995;</span>
                                Siswa mengangkat tangan.
                              </div>
                            )}
                            <div className="text-[12px] font-semibold mb-2">
                              Detail penilaian rubrik
                            </div>
                            {d.penilaian === "dinilai" ? (
                              <div className="flex items-center gap-3">
                                <span className="inline-block w-[120px] h-2.5 bg-paper rounded overflow-hidden">
                                  <span
                                    className="block h-full bg-pcb rounded"
                                    style={{
                                      width: `${d.nilaiRubrik}%`,
                                    }}
                                  />
                                </span>
                                <span className="font-mono text-[13px] font-medium">
                                  {d.nilaiRubrik}/100
                                </span>
                              </div>
                            ) : (
                              <div className="text-[12.5px] text-text-dim">
                                Menunggu penilaian guru.
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    {/* ── DL detail panel ─────────────────────── */}
                    {isOpen &&
                      activeModel === "DEEP_LEARNING" &&
                      (() => {
                        const d = dlData[s.id];
                        return (
                          <div className="bg-paper-dim p-4 border-t border-line">
                            {s.hand && (
                              <div className="bg-amber-soft border border-amber px-3 py-2 mb-3 text-[12.5px] text-amber flex items-center gap-2">
                                <span className="text-[16px]">&#9995;</span>
                                Siswa mengangkat tangan.
                              </div>
                            )}
                            <div className="text-[12px] font-semibold mb-2">
                              Skor per lapisan
                            </div>
                            <div className="flex flex-col gap-2">
                              {dlLayers.map((layer, i) => {
                                const skor = d.skor[i];
                                return (
                                  <div
                                    key={i}
                                    className="flex items-center gap-2 text-[12.5px]"
                                  >
                                    <span className="w-[100px] text-text-dim">
                                      {layer}
                                    </span>
                                    <span className="flex-1 h-2 bg-paper rounded overflow-hidden max-w-[120px]">
                                      {skor != null && (
                                        <span
                                          className="block h-full bg-pcb rounded"
                                          style={{ width: `${skor}%` }}
                                        />
                                      )}
                                    </span>
                                    <span className="font-mono text-[12px] w-8 text-right">
                                      {skor != null ? skor : "—"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Pola Kesalahan Kelas tab ─────────────────────── */
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

      {/* Hint Panel Modal */}
      {hintPanel && (
        <HintPanel
          studentName={hintPanel.studentName}
          soalNum={hintPanel.soalNum}
          onClose={() => setHintPanel(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ProblemSolvingEditor = dynamic(
  () =>
    import("@/components/editor/problem-solving-editor").then(
      (m) => m.ProblemSolvingEditor
    ),
  { ssr: false }
);

/* ── Types from API ─────────────────────────────── */

interface ApiTestCase {
  id: string;
  label: string | null;
  order: number;
}

interface ApiMilestone {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface ApiRubricCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  order: number;
}

interface ApiSoal {
  id: string;
  title: string;
  description: string;
  learningModel: string;
  difficulty: string;
  starterCode: string | null;
  language: string | null;
  regime: string | null;
  testCases: ApiTestCase[];
  milestones: ApiMilestone[];
  rubricCriteria: ApiRubricCriterion[];
  status: "available" | "done" | "in_progress";
  score: number | null;
  milestoneProgress: { milestoneId: string; status: string }[];
  rubricGrades: { criterionId: string; score: number }[];
  dueAt: string | null;
}

interface ApiKelas {
  kelasId: string;
  kelasName: string;
  soalList: ApiSoal[];
}

/* ── Badge mapping ──────────────────────────────── */

const modelBadge: Record<
  string,
  { variant: "pcb" | "copper" | "reflect" | "ocean"; label: string }
> = {
  PROBLEM_SOLVING: { variant: "pcb", label: "Problem Solving" },
  PBL: { variant: "copper", label: "Project Based Learning" },
  TRANSFORMATIF: { variant: "reflect", label: "Transformatif" },
  DEEP_LEARNING: { variant: "ocean", label: "Deep Learning" },
};

/* ── Hand-raise components ──────────────────────── */

function HandRaiseButton({
  raised,
  onToggle,
}: {
  raised: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 border-[1.5px] font-sans cursor-pointer transition-all",
        raised
          ? "border-amber bg-amber text-white animate-pulse-slow"
          : "border-line bg-white text-text-dim hover:border-amber hover:text-amber hover:bg-amber-soft"
      )}
    >
      &#9995; {raised ? "Tangan diangkat" : "Angkat tangan"}
    </button>
  );
}

function HandRaisedBanner({ onLower }: { onLower: () => void }) {
  return (
    <div className="bg-amber-soft border border-amber px-3.5 py-2 mt-2.5 flex items-center gap-2 text-[12.5px]">
      <span className="text-[16px] animate-pulse-slow inline-block">
        &#9995;
      </span>
      <span className="text-amber font-medium">
        Tangan diangkat — guru akan melihat permintaan bantuanmu.
      </span>
      <button
        onClick={onLower}
        className="ml-auto bg-transparent border border-amber text-amber font-sans text-[11px] px-2.5 py-0.5 cursor-pointer whitespace-nowrap"
      >
        Turunkan
      </button>
    </div>
  );
}

/* ── Main page ──────────────────────────────────── */

export default function LatihanPage() {
  const { data: session } = useSession();
  const [kelasList, setKelasList] = useState<ApiKelas[]>([]);
  const [selectedKelasIdx, setSelectedKelasIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeEditor, setActiveEditor] = useState<string | null>(null);
  const [handRaised, setHandRaised] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/siswa/latihan");
      if (!res.ok) throw new Error("Gagal memuat data");
      const json = await res.json();
      setKelasList(json.kelasList ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openEditor(id: string) {
    setActiveEditor(id);
    setHandRaised(false);
  }

  function closeEditor() {
    setActiveEditor(null);
    setHandRaised(false);
  }

  const kelas = kelasList[selectedKelasIdx] ?? null;
  const soalList = kelas?.soalList ?? [];
  const studentId = session?.user?.id ?? "";
  const kelasId = kelas?.kelasId ?? "";

  /* ── Loading state ────────────────────────────── */
  if (loading) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-[20px] font-semibold mb-1">Latihan</h1>
        <p className="text-[13.5px] text-text-dim mb-6">Memuat data...</p>
      </div>
    );
  }

  /* ── Error state ──────────────────────────────── */
  if (error) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-[20px] font-semibold mb-1">Latihan</h1>
        <p className="text-[13.5px] text-text-dim mb-6">{error}</p>
      </div>
    );
  }

  /* ── Empty: not in any kelas ──────────────────── */
  if (kelasList.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-[20px] font-semibold mb-1">Latihan</h1>
        <div className="border border-dashed border-line p-12 text-center text-[13.5px] text-text-dim mt-6">
          Kamu belum terdaftar di kelas mana pun. Hubungi guru untuk
          mendapatkan kode kelas.
        </div>
      </div>
    );
  }

  /* ── Empty: kelas has no soal ─────────────────── */
  if (soalList.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-[20px] font-semibold mb-1">Latihan</h1>
        {kelasList.length > 1 && (
          <div className="mb-4">
            <select
              className="border border-line bg-paper text-text-primary px-3 py-1.5 text-[13.5px] font-sans"
              value={selectedKelasIdx}
              onChange={(e) => setSelectedKelasIdx(Number(e.target.value))}
            >
              {kelasList.map((k, i) => (
                <option key={k.kelasId} value={i}>
                  {k.kelasName}
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="text-[13.5px] text-text-dim mb-6">{kelas!.kelasName}</p>
        <div className="border border-dashed border-line p-12 text-center text-[13.5px] text-text-dim">
          Belum ada soal yang ditugaskan ke kelas ini.
        </div>
      </div>
    );
  }

  /* ── Normal view ──────────────────────────────── */
  return (
    <div className="animate-fade-in">
      <h1 className="text-[20px] font-semibold mb-1">Latihan</h1>
      <p className="text-[13.5px] text-text-dim mb-6">
        {activeEditor
          ? "Sedang mengerjakan — koreksi baris berjalan otomatis, nilai akhir dihitung saat kamu kirim jawaban."
          : `${kelas!.kelasName} — pilih soal, editor akan terbuka langsung di kartu yang sama.`}
      </p>

      {!activeEditor && kelasList.length > 1 && (
        <div className="mb-4">
          <select
            className="border border-line bg-paper text-text-primary px-3 py-1.5 text-[13.5px] font-sans"
            value={selectedKelasIdx}
            onChange={(e) => setSelectedKelasIdx(Number(e.target.value))}
          >
            {kelasList.map((k, i) => (
              <option key={k.kelasId} value={i}>
                {k.kelasName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={cn("grid gap-3.5", !activeEditor && "grid-cols-2")}>
        {soalList.map((soal) => {
          if (activeEditor && activeEditor !== soal.id) return null;
          const badge = modelBadge[soal.learningModel];
          if (!badge) return null;

          return (
            <div
              key={soal.id}
              className={cn(
                "border border-line bg-white p-[18px] flex flex-col gap-2.5",
                activeEditor === soal.id && "col-span-full"
              )}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-[14.5px] font-semibold m-0">
                  {soal.title}
                </h3>
                <span className="text-[10.5px] font-mono px-2 py-0.5 border border-line text-text-dim">
                  {soal.difficulty}
                </span>
              </div>
              <p className="text-[12.5px] text-text-dim leading-relaxed m-0">
                {soal.description}
              </p>
              <div className="flex justify-between items-center mt-1">
                <Badge variant={badge.variant}>{badge.label}</Badge>
                {soal.status === "available" && !activeEditor && (
                  <Button
                    className="py-2 px-4 text-[12.5px]"
                    onClick={() => openEditor(soal.id)}
                  >
                    Kerjakan
                  </Button>
                )}
                {soal.status === "in_progress" && !activeEditor && (
                  <Button
                    className="py-2 px-4 text-[12.5px]"
                    onClick={() => openEditor(soal.id)}
                  >
                    Lanjutkan
                  </Button>
                )}
                {soal.status === "done" && (
                  <Button
                    variant="ghost"
                    className="py-2 px-4 text-[12.5px]"
                  >
                    Selesai{soal.score != null ? ` · ${Math.round(soal.score)}` : ""}
                  </Button>
                )}
              </div>

              {/* Hand raised banner — shown for non-PS editors */}
              {activeEditor === soal.id &&
                handRaised &&
                soal.learningModel !== "PROBLEM_SOLVING" && (
                  <HandRaisedBanner onLower={() => setHandRaised(false)} />
                )}

              {/* Problem Solving editor */}
              {activeEditor === soal.id &&
                soal.learningModel === "PROBLEM_SOLVING" && (
                  <ProblemSolvingEditor
                    soalId={soal.id}
                    title="Instruksi"
                    instructions={soal.description}
                    criteria={soal.testCases
                      .filter((tc) => tc.label)
                      .map((tc) => tc.label!)}
                    starterCode={soal.starterCode ?? ""}
                    starterHtml=""
                    language={(soal.language as "css" | "html" | "javascript") ?? "css"}
                    fileName={`soal.${soal.language ?? "css"}`}
                    regime={(soal.regime as "silent" | "verbose") ?? "verbose"}
                    studentId={studentId}
                    classId={kelasId}
                    onClose={closeEditor}
                  />
                )}

              {/* PBL editor */}
              {activeEditor === soal.id && soal.learningModel === "PBL" && (
                <div className="mt-4 border border-line bg-white">
                  <div className="flex justify-between items-center px-4 py-3.5 border-b border-line">
                    <strong className="text-[13.5px]">
                      Proyek: {soal.title}
                    </strong>
                    <div className="flex gap-1.5 items-center">
                      <HandRaiseButton
                        raised={handRaised}
                        onToggle={() => setHandRaised(!handRaised)}
                      />
                      <button
                        onClick={closeEditor}
                        className="bg-transparent border border-line text-text-primary px-3 py-1.5 text-[12px] font-sans cursor-pointer"
                      >
                        ← Daftar soal
                      </button>
                    </div>
                  </div>
                  {soal.milestones.length > 0 ? (
                    <>
                      <div className="flex px-4 py-4 gap-2">
                        {soal.milestones.map((ms, i) => {
                          const prog = soal.milestoneProgress.find(
                            (p) => p.milestoneId === ms.id
                          );
                          const done = prog?.status === "APPROVED";
                          const current =
                            !done &&
                            (prog?.status === "IN_PROGRESS" ||
                              prog?.status === "PENDING_REVIEW" ||
                              prog?.status === "REVISION_NEEDED" ||
                              (!prog &&
                                i ===
                                  soal.milestones.findIndex((m) => {
                                    const p = soal.milestoneProgress.find(
                                      (pr) => pr.milestoneId === m.id
                                    );
                                    return !p || p.status !== "APPROVED";
                                  })));
                          return (
                            <div key={ms.id} className="flex items-center gap-0">
                              <div className="flex-1 text-center">
                                <div
                                  className={cn(
                                    "w-6.5 h-6.5 rounded-full border-[1.5px] flex items-center justify-center mx-auto mb-1.5 font-mono text-[12px]",
                                    done
                                      ? "bg-pcb border-pcb text-white"
                                      : current
                                        ? "bg-copper border-copper text-white"
                                        : "bg-white border-line text-text-dim"
                                  )}
                                >
                                  {done ? "✓" : i + 1}
                                </div>
                                <small className="text-[11px] text-text-dim">
                                  {ms.title}
                                </small>
                              </div>
                              {i < soal.milestones.length - 1 && (
                                <div
                                  className={cn(
                                    "flex-1 h-0.5 mt-3",
                                    done ? "bg-pcb" : "bg-line"
                                  )}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-4 pb-5">
                        {(() => {
                          const currentIdx = soal.milestones.findIndex((m) => {
                            const p = soal.milestoneProgress.find(
                              (pr) => pr.milestoneId === m.id
                            );
                            return !p || p.status !== "APPROVED";
                          });
                          const ms =
                            currentIdx >= 0
                              ? soal.milestones[currentIdx]
                              : soal.milestones[soal.milestones.length - 1];
                          const idx = currentIdx >= 0 ? currentIdx : soal.milestones.length - 1;
                          return (
                            <>
                              <h4 className="text-[13.5px] font-semibold mb-1.5">
                                Tahap {idx + 1} dari {soal.milestones.length} —{" "}
                                {ms.title}
                              </h4>
                              <p className="text-[12.5px] text-text-dim leading-relaxed mb-3.5">
                                {ms.description}
                              </p>
                            </>
                          );
                        })()}
                        <pre className="bg-ink text-[#d7e6dd] font-mono text-[12.5px] p-3 mb-3.5 whitespace-pre-wrap">
                          {soal.starterCode ?? ""}
                        </pre>
                        <button className="bg-copper text-white border-none px-4 py-2 text-[12.5px] font-sans cursor-pointer">
                          Kirim tahap ini untuk diperiksa
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-8 text-center text-[13px] text-text-dim">
                      Belum ada milestone untuk soal ini.
                    </div>
                  )}
                </div>
              )}

              {/* Transformatif editor */}
              {activeEditor === soal.id &&
                soal.learningModel === "TRANSFORMATIF" && (
                  <div className="mt-4 border border-line bg-white p-5">
                    <h4 className="text-[13.5px] font-semibold mb-1.5">
                      {soal.title}
                    </h4>
                    <p className="text-[12.5px] text-text-dim leading-relaxed mb-3.5">
                      {soal.description}
                    </p>
                    {soal.rubricCriteria.length > 0 && (
                      <div className="mb-3.5 text-[12px] text-text-dim border border-line p-3">
                        <strong className="text-text-primary text-[12px]">
                          Kriteria penilaian:
                        </strong>
                        <ul className="mt-1.5 pl-4 list-disc">
                          {soal.rubricCriteria.map((rc) => (
                            <li key={rc.id}>
                              {rc.name} (maks {rc.maxScore})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <textarea
                      className="w-full min-h-[110px] border border-line font-sans text-[13px] p-3 resize-y text-text-primary bg-paper"
                      placeholder="Tulis refleksimu di sini..."
                    />
                    <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
                      <small className="text-text-dim text-[11.5px]">
                        Tidak ada skor otomatis — guru akan menilai dengan
                        rubrik kualitatif.
                      </small>
                      <div className="flex gap-2 items-center">
                        <HandRaiseButton
                          raised={handRaised}
                          onToggle={() => setHandRaised(!handRaised)}
                        />
                        <button
                          onClick={closeEditor}
                          className="bg-transparent border border-line text-text-primary px-3 py-1.5 text-[12px] font-sans cursor-pointer"
                        >
                          ← Daftar soal
                        </button>
                        <button className="bg-copper text-white border-none px-3 py-1.5 text-[12px] font-sans cursor-pointer">
                          Kirim untuk dinilai guru
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {/* Deep Learning editor */}
              {activeEditor === soal.id &&
                soal.learningModel === "DEEP_LEARNING" && (
                  <div className="mt-4 border border-line bg-white">
                    <div className="flex justify-between items-center px-4 py-3.5 border-b border-line">
                      <strong className="text-[13.5px]">{soal.title}</strong>
                      <button
                        onClick={closeEditor}
                        className="bg-transparent border border-line text-text-primary px-3 py-1.5 text-[12px] font-sans cursor-pointer"
                      >
                        ← Daftar soal
                      </button>
                    </div>
                    {soal.rubricCriteria.length > 0 ? (
                      <>
                        <div className="flex px-5 pt-4 pb-2 gap-0">
                          {soal.rubricCriteria.map((layer, i) => {
                            const grade = soal.rubricGrades.find(
                              (g) => g.criterionId === layer.id
                            );
                            const done = grade != null && grade.score > 0;
                            const current =
                              !done &&
                              i ===
                                soal.rubricCriteria.findIndex((c) => {
                                  const g = soal.rubricGrades.find(
                                    (gr) => gr.criterionId === c.id
                                  );
                                  return !g || g.score === 0;
                                });
                            return (
                              <div
                                key={layer.id}
                                className="flex items-center gap-0"
                              >
                                <div className="text-center">
                                  <div
                                    className={cn(
                                      "w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center mx-auto mb-1.5 font-mono text-[12px]",
                                      done
                                        ? "bg-ocean border-ocean text-white"
                                        : current
                                          ? "bg-ocean border-ocean text-white"
                                          : "bg-white border-line text-text-dim"
                                    )}
                                  >
                                    {done ? "✓" : i + 1}
                                  </div>
                                  <small className="text-[10px] text-text-dim whitespace-nowrap">
                                    {layer.name}
                                  </small>
                                </div>
                                {i < soal.rubricCriteria.length - 1 && (
                                  <div
                                    className={cn(
                                      "w-8 h-0.5 mt-[-12px] mx-1",
                                      done ? "bg-ocean" : "bg-line"
                                    )}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="px-5 pb-5">
                          {(() => {
                            const currentIdx = soal.rubricCriteria.findIndex(
                              (c) => {
                                const g = soal.rubricGrades.find(
                                  (gr) => gr.criterionId === c.id
                                );
                                return !g || g.score === 0;
                              }
                            );
                            const layer =
                              currentIdx >= 0
                                ? soal.rubricCriteria[currentIdx]
                                : soal.rubricCriteria[
                                    soal.rubricCriteria.length - 1
                                  ];
                            const idx =
                              currentIdx >= 0
                                ? currentIdx
                                : soal.rubricCriteria.length - 1;
                            return (
                              <>
                                <h4 className="text-[13.5px] font-semibold mb-1.5">
                                  Lapisan {idx + 1} dari{" "}
                                  {soal.rubricCriteria.length} — {layer.name}
                                </h4>
                                <p className="text-[12.5px] text-text-dim leading-relaxed mb-3">
                                  {layer.description}
                                </p>
                              </>
                            );
                          })()}
                          <textarea
                            className="w-full min-h-[100px] border border-line font-sans text-[13px] p-3 resize-y text-text-primary bg-paper mb-3"
                            placeholder="Tulis analisismu di sini..."
                          />
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <small className="text-text-dim text-[11.5px]">
                              Dinilai per lapisan — skor lapisan lebih tinggi
                              bernilai lebih besar.
                            </small>
                            <div className="flex gap-1.5 items-center">
                              <HandRaiseButton
                                raised={handRaised}
                                onToggle={() => setHandRaised(!handRaised)}
                              />
                              <button className="bg-[var(--ocean)] text-white border-none px-4 py-2 text-[12.5px] font-sans cursor-pointer">
                                Kirim lapisan ini
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="px-4 py-8 text-center text-[13px] text-text-dim">
                        Belum ada lapisan penilaian untuk soal ini.
                      </div>
                    )}
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

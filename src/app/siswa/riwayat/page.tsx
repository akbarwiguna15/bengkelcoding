"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface TestCaseResult {
  testCaseId: string;
  label: string;
  passed: boolean;
  actual: string;
  expected: string;
}

interface MilestoneProgressItem {
  milestoneId: string;
  title: string;
  order: number;
  status: string;
  teacherNote: string | null;
}

interface RubricGradeItem {
  criterionId: string;
  name: string;
  maxScore: number;
  score: number;
  feedback: string | null;
}

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  order: number;
}

interface MilestoneItem {
  id: string;
  title: string;
  order: number;
}

interface TestCaseItem {
  id: string;
  label: string;
  order: number;
  expected: string;
}

interface SubmissionRecord {
  id: string;
  soalId: string;
  soalTitle: string;
  learningModel: string;
  status: string;
  autoGradeScore: number | null;
  totalScore: number | null;
  testsPassed: number | null;
  testsTotal: number | null;
  teacherComment: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  testCases: TestCaseItem[];
  testResultsJson: TestCaseResult[] | null;
  milestones: MilestoneItem[];
  milestoneProgress: MilestoneProgressItem[];
  rubricCriteria: RubricCriterion[];
  rubricGrades: RubricGradeItem[];
}

export default function HasilPage() {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/siswa/riwayat");
      if (res.ok) {
        setSubmissions(await res.json());
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const byModel = (model: string) =>
    submissions.filter((s) => s.learningModel === model);

  return (
    <div className="animate-fade-in">
      <h1 className="text-[20px] font-semibold mb-1">Hasil</h1>
      <p className="text-[13.5px] text-text-dim mb-6">
        Bentuk hasil menyesuaikan model pembelajaran soal yang dikerjakan.
      </p>

      {!loaded ? (
        <div className="text-[13px] text-text-dim py-8">Memuat...</div>
      ) : (
        <Tabs
          tabs={[
            { id: "ps", label: "Problem Solving" },
            { id: "pbl", label: "Project Based Learning" },
            { id: "tf", label: "Transformatif" },
            { id: "dl", label: "Deep Learning" },
          ]}
        >
          {(activeTab) => {
            if (activeTab === "ps")
              return <ProblemSolvingResults items={byModel("PROBLEM_SOLVING")} />;
            if (activeTab === "pbl")
              return <PBLResults items={byModel("PBL")} />;
            if (activeTab === "tf")
              return <TransformatifResults items={byModel("TRANSFORMATIF")} />;
            return <DeepLearningResults items={byModel("DEEP_LEARNING")} />;
          }}
        </Tabs>
      )}
    </div>
  );
}

function EmptyState({ model }: { model: string }) {
  return (
    <div className="py-8 text-center text-[13.5px] text-text-dim">
      Belum ada submission untuk model {model}.
    </div>
  );
}

function ProblemSolvingResults({ items }: { items: SubmissionRecord[] }) {
  if (items.length === 0) return <EmptyState model="Problem Solving" />;

  return (
    <div className="flex flex-col gap-6">
      {items.map((sub) => {
        const score = sub.totalScore ?? sub.autoGradeScore;
        const passed = sub.testsPassed ?? 0;
        const total = sub.testsTotal ?? sub.testCases.length;
        const hasDetailedResults = sub.testResultsJson && sub.testResultsJson.length > 0;
        const resultMap = hasDetailedResults
          ? new Map(sub.testResultsJson!.map((r) => [r.testCaseId, r]))
          : null;

        return (
          <div key={sub.id}>
            <p className="text-[13.5px] text-text-dim mb-0">
              {sub.soalTitle} — dikoreksi otomatis oleh sistem.
            </p>
            <div className="flex items-center gap-5 my-5">
              <div className="font-mono text-[38px] font-semibold text-pcb">
                {score != null ? Math.round(score) : "—"}
                <span className="text-[16px] text-text-dim">/100</span>
              </div>
              <div className="text-[13px] text-text-dim max-w-[360px]">
                {passed} dari {total} kriteria terpenuhi.
                {passed < total &&
                  " Perbaiki bagian yang gagal lalu kirim ulang jika ingin memperbaiki nilai."}
              </div>
            </div>
            <div className="flex flex-col">
              {sub.testCases.map((tc, i) => {
                const detail = resultMap?.get(tc.id);
                const isPassed = detail ? detail.passed : null;

                return (
                  <div
                    key={tc.id}
                    className={cn(
                      "flex justify-between items-center px-4 py-3 border-b border-line text-[13px]",
                      i === 0 && "border-t"
                    )}
                  >
                    <span>{tc.label ?? `Kriteria ${i + 1}`}</span>
                    <span
                      className={cn(
                        "font-mono text-[12px] font-semibold",
                        isPassed === true
                          ? "text-pcb"
                          : isPassed === false
                          ? "text-rust"
                          : "text-text-dim"
                      )}
                    >
                      {isPassed === true
                        ? "LULUS"
                        : isPassed === false
                        ? "GAGAL"
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            {resultMap && (
              <>
                {sub.testResultsJson!
                  .filter((r) => !r.passed && r.expected)
                  .map((r) => (
                    <div
                      key={r.testCaseId}
                      className="bg-rust-soft border-l-[3px] border-rust px-3.5 py-3 mt-2 text-[12.5px] text-[#7c3a20] leading-relaxed"
                    >
                      <strong>{r.label ?? "Kriteria"}:</strong> Ditemukan nilai{" "}
                      <code className="font-mono">{r.actual || "(kosong)"}</code> — soal
                      meminta{" "}
                      <code className="font-mono">{r.expected}</code>.
                    </div>
                  ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PBLResults({ items }: { items: SubmissionRecord[] }) {
  if (items.length === 0) return <EmptyState model="Project Based Learning" />;

  return (
    <div className="flex flex-col gap-6">
      {items.map((sub) => {
        const milestones = sub.milestones;
        const progressMap = new Map(
          sub.milestoneProgress.map((mp) => [mp.milestoneId, mp])
        );
        const approved = sub.milestoneProgress.filter(
          (mp) => mp.status === "APPROVED"
        ).length;
        const currentIdx = milestones.findIndex((m) => {
          const mp = progressMap.get(m.id);
          return !mp || mp.status !== "APPROVED";
        });

        return (
          <div key={sub.id}>
            <p className="text-[13.5px] text-text-dim mb-0">
              {sub.soalTitle} — dinilai bertahap per milestone.
            </p>
            <div className="flex py-5 gap-2 max-w-[420px]">
              {milestones.map((m, i) => {
                const mp = progressMap.get(m.id);
                const isDone = mp?.status === "APPROVED";
                const isCurrent = i === currentIdx;
                return (
                  <div key={m.id} className="contents">
                    {i > 0 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5 mt-3",
                          isDone || isCurrent ? "bg-pcb" : "bg-line"
                        )}
                      />
                    )}
                    <div className="flex-1 text-center">
                      <div
                        className={cn(
                          "w-6.5 h-6.5 rounded-full border-[1.5px] flex items-center justify-center mx-auto mb-1.5 font-mono text-[12px]",
                          isDone
                            ? "bg-pcb border-pcb text-white"
                            : isCurrent
                            ? "bg-copper border-copper text-white"
                            : "bg-white border-line text-text-dim"
                        )}
                      >
                        {isDone ? "✓" : i + 1}
                      </div>
                      <small className="text-[11px] text-text-dim">
                        {m.title}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="max-w-[520px]">
              {milestones.map((m, i) => {
                const mp = progressMap.get(m.id);
                const statusLabel = mp
                  ? mp.status === "APPROVED"
                    ? "DISETUJUI"
                    : mp.status === "PENDING_REVIEW"
                    ? "MENUNGGU REVIEW"
                    : mp.status === "REVISION_NEEDED"
                    ? "PERLU REVISI"
                    : mp.status === "IN_PROGRESS"
                    ? "SEDANG DIKERJAKAN"
                    : "TERKUNCI"
                  : "TERKUNCI";
                const isDone = mp?.status === "APPROVED";

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex justify-between items-center px-4 py-3 border-b border-line text-[13px]",
                      i === 0 && "border-t"
                    )}
                  >
                    <span>
                      Tahap {i + 1} — {m.title}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[12px] font-semibold",
                        isDone ? "text-pcb" : "text-amber"
                      )}
                    >
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            {milestones.length > 0 && approved < milestones.length && (
              <div className="border border-dashed border-line p-3 text-[12px] text-text-dim leading-relaxed mt-3 max-w-[520px]">
                Nilai akhir baru muncul setelah semua tahap diselesaikan dan
                disetujui guru — bukan dari satu kali submit.
              </div>
            )}
            {sub.milestoneProgress
              .filter((mp) => mp.teacherNote)
              .map((mp) => (
                <div
                  key={mp.milestoneId}
                  className="bg-rust-soft border-l-[3px] border-rust px-3.5 py-3 mt-2 text-[12.5px] text-[#7c3a20] leading-relaxed"
                >
                  <strong>{mp.title}:</strong> {mp.teacherNote}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}

function TransformatifResults({ items }: { items: SubmissionRecord[] }) {
  if (items.length === 0) return <EmptyState model="Transformatif" />;

  return (
    <div className="flex flex-col gap-6">
      {items.map((sub) => {
        const hasGrades = sub.rubricGrades.length > 0;
        const gradeMap = new Map(
          sub.rubricGrades.map((rg) => [rg.criterionId, rg])
        );

        return (
          <div key={sub.id}>
            <p className="text-[13.5px] text-text-dim mb-0">
              {sub.soalTitle} —{" "}
              {hasGrades
                ? "dinilai oleh guru."
                : "menunggu penilaian guru."}
            </p>
            <div className="flex items-center gap-5 my-5">
              {hasGrades ? (
                <div className="font-mono text-[22px] font-semibold text-reflect">
                  {sub.totalScore != null
                    ? `${Math.round(sub.totalScore)}/100`
                    : "Dinilai"}
                </div>
              ) : (
                <div className="font-mono text-[22px] font-semibold text-reflect">
                  Menunggu penilaian guru
                </div>
              )}
            </div>
            {sub.rubricCriteria.length > 0 && (
              <div className="max-w-[520px]">
                {sub.rubricCriteria.map((rc, i) => {
                  const grade = gradeMap.get(rc.id);
                  return (
                    <div
                      key={rc.id}
                      className={cn(
                        "flex justify-between items-center px-4 py-3 border-b border-line text-[13px]",
                        i === 0 && "border-t"
                      )}
                    >
                      <span>{rc.name}</span>
                      <span
                        className={cn(
                          "font-mono text-[12px] font-semibold",
                          grade ? "text-reflect" : "text-text-dim"
                        )}
                      >
                        {grade
                          ? `${grade.score}/${rc.maxScore}`
                          : "BELUM DINILAI"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {sub.rubricGrades
              .filter((rg) => rg.feedback)
              .map((rg) => (
                <div
                  key={rg.criterionId}
                  className="border border-dashed border-line p-3 text-[12px] text-text-dim leading-relaxed mt-2 max-w-[520px]"
                >
                  <strong>{rg.name}:</strong> {rg.feedback}
                </div>
              ))}
            {!hasGrades && (
              <div className="border border-dashed border-line p-3 text-[12px] text-text-dim leading-relaxed mt-3 max-w-[520px]">
                Guru akan menilai secara manual — tidak ada skor angka otomatis
                untuk soal reflektif.
              </div>
            )}
            {sub.teacherComment && (
              <div className="border border-line bg-white p-5 max-w-[560px] mt-3">
                <h4 className="text-[13.5px] font-semibold mb-1.5">
                  Catatan guru
                </h4>
                <p className="text-[12.5px] text-text-dim leading-relaxed">
                  {sub.teacherComment}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DeepLearningResults({ items }: { items: SubmissionRecord[] }) {
  if (items.length === 0) return <EmptyState model="Deep Learning" />;

  return (
    <div className="flex flex-col gap-6">
      {items.map((sub) => {
        const milestones = sub.milestones;
        const progressMap = new Map(
          sub.milestoneProgress.map((mp) => [mp.milestoneId, mp])
        );
        const done = sub.milestoneProgress.filter(
          (mp) => mp.status === "APPROVED"
        ).length;
        const totalLayers = milestones.length;

        return (
          <div key={sub.id}>
            <p className="text-[13.5px] text-text-dim mb-0">
              {sub.soalTitle} — dinilai per lapisan analisis.
            </p>
            <div className="flex items-center gap-5 my-5">
              <div className="font-mono text-[38px] font-semibold text-[var(--ocean)]">
                {sub.totalScore != null
                  ? Math.round(sub.totalScore)
                  : sub.autoGradeScore != null
                  ? Math.round(sub.autoGradeScore)
                  : "—"}
                <span className="text-[16px] text-text-dim">/100</span>
              </div>
              <div className="text-[13px] text-text-dim max-w-[360px]">
                {done} dari {totalLayers} lapisan selesai.
                {done < totalLayers &&
                  " Selesaikan lapisan berikutnya untuk mendapat skor penuh."}
              </div>
            </div>
            <div className="max-w-[520px]">
              {milestones.map((m, i) => {
                const mp = progressMap.get(m.id);
                const isDone = mp?.status === "APPROVED";
                const isCurrent =
                  mp?.status === "IN_PROGRESS" ||
                  mp?.status === "PENDING_REVIEW" ||
                  mp?.status === "REVISION_NEEDED";
                const isLocked = !mp || mp.status === "LOCKED";

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex justify-between items-center px-4 py-3 border-b border-line text-[13px]",
                      i === 0 && "border-t"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] border-[1.5px]",
                          isDone
                            ? "bg-[var(--ocean)] border-[var(--ocean)] text-white"
                            : isCurrent
                            ? "bg-[var(--ocean)] border-[var(--ocean)] text-white"
                            : "bg-white border-line text-text-dim"
                        )}
                      >
                        {isDone ? "✓" : i + 1}
                      </span>
                      Lapisan {i + 1} — {m.title}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[12px] font-semibold",
                        isDone
                          ? "text-[var(--ocean)]"
                          : isCurrent
                          ? "text-amber"
                          : "text-text-dim"
                      )}
                    >
                      {isDone
                        ? "SELESAI"
                        : isCurrent
                        ? mp?.status === "PENDING_REVIEW"
                          ? "MENUNGGU REVIEW"
                          : mp?.status === "REVISION_NEEDED"
                          ? "PERLU REVISI"
                          : "SEDANG DIKERJAKAN"
                        : isLocked
                        ? "TERKUNCI"
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            {done < totalLayers && (
              <div className="border border-dashed border-line p-3 text-[12px] text-text-dim leading-relaxed mt-3 max-w-[520px]">
                Lapisan berikutnya terbuka setelah lapisan sebelumnya dikirim dan
                disetujui.
              </div>
            )}
            {sub.milestoneProgress
              .filter((mp) => mp.teacherNote)
              .map((mp) => (
                <div
                  key={mp.milestoneId}
                  className="bg-rust-soft border-l-[3px] border-rust px-3.5 py-3 mt-2 text-[12.5px] text-[#7c3a20] leading-relaxed"
                >
                  <strong>{mp.title}:</strong> {mp.teacherNote}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}

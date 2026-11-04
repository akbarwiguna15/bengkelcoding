"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/* ─── Feature flag ─────────────────────────────────────────────── */

const ENABLE_AUTO_STUCK = false;

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
  id: string;
  name: string;
  done: number;
  total: number;
  avg: number;
  status: "selesai" | "berjalan";
  soalStatus: ("benar" | "salah" | "proses" | "belum")[];
  hand: boolean;
  autoStuck?: boolean;
  hp: PriorityData;
  live?: boolean;
  liveMin?: number;
}

interface HintPanelState {
  studentId: string;
  studentName: string;
  soalId: string;
  soalNum: number;
}

interface PblRow {
  reached: number;
  total: number;
  lastApproved: string;
  status: "berjalan" | "selesai" | "revisi";
}

interface TrfRow {
  refleksiSent: number;
  refleksiTotal: number;
  penilaian: "menunggu" | "dinilai";
  nilaiRubrik: number | null;
}

interface DlRow {
  lapisan: string;
  skor: (number | null)[];
  total: number | null;
}

/* ─── API response types ─────────────────────────────────────── */

interface ApiSoal {
  soalId: string;
  title: string;
  learningModel: SoalModel;
  difficulty: number;
  estimatedMinutes: number | null;
  dueAt: string | null;
  testCaseCount: number;
  milestones: { id: string; title: string; order: number }[];
  rubricCriteria: {
    id: string;
    name: string;
    maxScore: number;
    order: number;
  }[];
}

interface ApiSubmission {
  soalId: string;
  status: string | null;
  testsPassed: number | null;
  testsTotal: number | null;
  autoGradeScore: number | null;
  totalScore: number | null;
  createdAt: string | null;
  milestoneProgress: { milestoneId: string; status: string }[];
  rubricGrades: { criterionId: string; score: number }[];
}

interface ApiStudent {
  id: string;
  name: string;
  submissions: ApiSubmission[];
  handRaised: boolean;
  hintCount: number;
  activeSoalId: string | null;
  activityStatus: string | null;
  stuckSince: string | null;
  lastEventAt: string | null;
  errorCounts: Record<string, number>;
  submitCounts: Record<string, number>;
}

interface ApiErrorPattern {
  conceptTagName: string;
  soalTitle: string;
  studentCount: number;
  totalStudents: number;
  pct: number;
}

interface RekapData {
  kelas: { id: string; name: string };
  soalList: ApiSoal[];
  students: ApiStudent[];
  errorPatterns: ApiErrorPattern[];
}

interface KelasItem {
  id: string;
  name: string;
  _count: { members: number; assignments: number };
}

interface HintRecord {
  id: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  sender: { name: string };
  receiver: { name: string };
}

/* ─── Model tab config ───────────────────────────────────────── */

const MODEL_TABS: { id: SoalModel; label: string }[] = [
  { id: "PROBLEM_SOLVING", label: "Problem Solving" },
  { id: "PBL", label: "Project Based Learning" },
  { id: "TRANSFORMATIF", label: "Transformatif" },
  { id: "DEEP_LEARNING", label: "Deep Learning" },
];

/* ─── Priority helpers (preserved as-is) ────────────────────── */

function calcPrio(s: StudentRow): number {
  if ((!s.hand && !s.autoStuck) || !s.hp) return 0;
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
  if (score >= 60)
    return { label: "Urgent", color: "text-rust", bg: "bg-rust-soft border-rust" };
  if (score >= 35)
    return { label: "Tinggi", color: "text-amber", bg: "bg-amber-soft border-amber" };
  return { label: "Sedang", color: "text-text-dim", bg: "bg-paper-dim border-line" };
}

/* ─── Soal status display ───────────────────────────────────── */

const soalColors: Record<string, string> = {
  benar: "bg-pcb border-pcb text-white",
  salah: "bg-rust border-rust text-white",
  proses: "bg-amber border-amber text-white animate-pulse-slow",
  belum: "bg-white border-line border-dashed text-text-dim",
};

/* ─── Data transformation ───────────────────────────────────── */

function difficultyLabel(d: number): "Mudah" | "Menengah" | "Sulit" {
  if (d <= 1) return "Mudah";
  if (d <= 2) return "Menengah";
  return "Sulit";
}

function soalStatusFromSub(sub: ApiSubmission): "benar" | "salah" | "proses" | "belum" {
  if (!sub.status) return "belum";
  if (sub.status === "IN_PROGRESS") return "proses";
  if (sub.testsTotal != null && sub.testsTotal > 0) {
    return sub.testsPassed === sub.testsTotal ? "benar" : "salah";
  }
  const score = sub.totalScore ?? sub.autoGradeScore;
  if (score != null) return score >= 70 ? "benar" : "salah";
  return sub.status === "SUBMITTED" ? "proses" : "belum";
}

function buildDashboardData(data: RekapData) {
  const soalModels = data.soalList.map((s) => s.learningModel);

  const modelCounts: Record<SoalModel, number> = {
    PROBLEM_SOLVING: 0,
    PBL: 0,
    TRANSFORMATIF: 0,
    DEEP_LEARNING: 0,
  };
  soalModels.forEach((m) => modelCounts[m]++);

  const modelSoalIndices: Record<SoalModel, number[]> = {
    PROBLEM_SOLVING: [],
    PBL: [],
    TRANSFORMATIF: [],
    DEEP_LEARNING: [],
  };
  soalModels.forEach((m, i) => modelSoalIndices[m].push(i));

  const pblData: Record<string, PblRow> = {};
  const trfData: Record<string, TrfRow> = {};
  const dlData: Record<string, DlRow> = {};

  const students: StudentRow[] = data.students.map((apiSt) => {
    const soalStatus = apiSt.submissions.map((sub) => soalStatusFromSub(sub));

    const gradedSubs = apiSt.submissions.filter(
      (sub) => sub.status === "SUBMITTED" || sub.status === "GRADED"
    );
    const scores = gradedSubs
      .map((sub) => sub.totalScore ?? sub.autoGradeScore)
      .filter((s): s is number => s != null);
    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    const done = gradedSubs.length;
    const total = apiSt.submissions.length;
    const allDone = total > 0 && done === total;

    const activeSoalIdx = apiSt.activeSoalId
      ? data.soalList.findIndex((s) => s.soalId === apiSt.activeSoalId)
      : -1;
    const activeSoal =
      activeSoalIdx >= 0 ? data.soalList[activeSoalIdx] : null;

    let timeLeft: number | null = null;
    if (activeSoal?.estimatedMinutes && apiSt.lastEventAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(apiSt.lastEventAt).getTime()) / 60000
      );
      timeLeft = Math.max(0, activeSoal.estimatedMinutes - elapsed);
    }

    const activeSoalErrors = apiSt.activeSoalId
      ? apiSt.errorCounts[apiSt.activeSoalId] ?? 0
      : 0;
    const activeSoalSubmits = apiSt.activeSoalId
      ? apiSt.submitCounts[apiSt.activeSoalId] ?? 0
      : 0;

    const isLive =
      apiSt.activityStatus != null &&
      apiSt.activityStatus !== "IDLE" &&
      apiSt.activityStatus !== "SUBMITTED";
    let liveMin: number | undefined;
    if (isLive && apiSt.lastEventAt) {
      liveMin = Math.floor(
        (Date.now() - new Date(apiSt.lastEventAt).getTime()) / 60000
      );
    }

    const row: StudentRow = {
      id: apiSt.id,
      name: apiSt.name,
      done,
      total,
      avg,
      status: allDone ? "selesai" : "berjalan",
      soalStatus,
      hand: apiSt.handRaised,
      autoStuck: ENABLE_AUTO_STUCK
        ? apiSt.activityStatus === "STUCK"
        : undefined,
      hp: {
        fail: activeSoalSubmits,
        repeat: activeSoalErrors,
        df: activeSoal ? difficultyLabel(activeSoal.difficulty) : "Menengah",
        helped: apiSt.hintCount > 0,
        timeLeft,
      },
      live: isLive || undefined,
      liveMin,
    };

    // --- PBL data ---
    const pblIndices = modelSoalIndices.PBL;
    if (pblIndices.length > 0) {
      let totalMilestones = 0;
      let approvedMilestones = 0;
      let lastApprovedName = "—";
      let hasRevision = false;
      let allPblDone = true;

      for (const idx of pblIndices) {
        const soal = data.soalList[idx];
        const sub = apiSt.submissions[idx];
        totalMilestones += soal.milestones.length;

        if (!sub.status || sub.status === "IN_PROGRESS") allPblDone = false;

        const progressMap = new Map(
          sub.milestoneProgress.map((mp) => [mp.milestoneId, mp.status])
        );
        for (const ms of soal.milestones) {
          const mStatus = progressMap.get(ms.id);
          if (mStatus === "APPROVED") {
            approvedMilestones++;
            lastApprovedName = ms.title;
          }
          if (mStatus === "REVISION_NEEDED") hasRevision = true;
        }
      }

      pblData[apiSt.id] = {
        reached: approvedMilestones,
        total: totalMilestones,
        lastApproved: lastApprovedName,
        status: allPblDone
          ? "selesai"
          : hasRevision
            ? "revisi"
            : "berjalan",
      };
    }

    // --- TRF data ---
    const trfIndices = modelSoalIndices.TRANSFORMATIF;
    if (trfIndices.length > 0) {
      let refleksiSent = 0;
      let totalRubrikScore = 0;
      let totalMaxScore = 0;
      let hasGrade = false;

      for (const idx of trfIndices) {
        const soal = data.soalList[idx];
        const sub = apiSt.submissions[idx];
        if (sub.status === "SUBMITTED" || sub.status === "GRADED")
          refleksiSent++;

        for (const crit of soal.rubricCriteria) {
          totalMaxScore += crit.maxScore;
          const grade = sub.rubricGrades.find(
            (g) => g.criterionId === crit.id
          );
          if (grade) {
            totalRubrikScore += grade.score;
            hasGrade = true;
          }
        }
      }

      const nilaiRubrik =
        hasGrade && totalMaxScore > 0
          ? Math.round((totalRubrikScore / totalMaxScore) * 100)
          : null;

      trfData[apiSt.id] = {
        refleksiSent,
        refleksiTotal: trfIndices.length,
        penilaian: hasGrade ? "dinilai" : "menunggu",
        nilaiRubrik,
      };
    }

    // --- DL data ---
    const dlIndices = modelSoalIndices.DEEP_LEARNING;
    if (dlIndices.length > 0) {
      const layerScores: (number | null)[] = [];
      let highestLayerName = "—";

      for (const idx of dlIndices) {
        const soal = data.soalList[idx];
        const sub = apiSt.submissions[idx];

        if (soal.rubricCriteria.length > 0) {
          for (const crit of soal.rubricCriteria) {
            const grade = sub.rubricGrades.find(
              (g) => g.criterionId === crit.id
            );
            const score =
              grade && crit.maxScore > 0
                ? Math.round((grade.score / crit.maxScore) * 100)
                : null;
            layerScores.push(score);
            if (score != null) highestLayerName = crit.name;
          }
        } else {
          const score = sub.totalScore ?? sub.autoGradeScore;
          layerScores.push(score != null ? Math.round(score) : null);
          if (score != null) highestLayerName = soal.title;
        }
      }

      const validScores = layerScores.filter(
        (s): s is number => s != null
      );
      const dlTotal =
        validScores.length > 0
          ? Math.round(
              validScores.reduce((a, b) => a + b, 0) / validScores.length
            )
          : null;

      dlData[apiSt.id] = {
        lapisan: highestLayerName,
        skor: layerScores,
        total: dlTotal,
      };
    }

    return row;
  });

  // Derive DL layer names from rubric criteria or soal titles
  const dlLayerNames: string[] = [];
  for (const idx of modelSoalIndices.DEEP_LEARNING) {
    const soal = data.soalList[idx];
    if (soal.rubricCriteria.length > 0) {
      for (const crit of soal.rubricCriteria) {
        if (!dlLayerNames.includes(crit.name)) dlLayerNames.push(crit.name);
      }
    } else {
      if (!dlLayerNames.includes(soal.title))
        dlLayerNames.push(soal.title);
    }
  }

  // PBL milestone names
  const pblMilestoneNames: string[] = [];
  for (const idx of modelSoalIndices.PBL) {
    for (const ms of data.soalList[idx].milestones) {
      if (!pblMilestoneNames.includes(ms.title))
        pblMilestoneNames.push(ms.title);
    }
  }

  return {
    students,
    soalModels,
    modelCounts,
    modelSoalIndices,
    pblData,
    trfData,
    dlData,
    pblMilestones: pblMilestoneNames,
    dlLayers: dlLayerNames,
  };
}

/* ─── HintPanel ──────────────────────────────────────────────── */

function HintPanel({
  studentId,
  studentName,
  soalId,
  soalNum,
  onClose,
}: {
  studentId: string;
  studentName: string;
  soalId: string;
  soalNum: number;
  onClose: () => void;
}) {
  const [hints, setHints] = useState<HintRecord[]>([]);
  const [hintDraft, setHintDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/hints?soalId=${soalId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const forStudent = data.filter(
            (h: HintRecord & { receiverId?: string }) =>
              h.receiver?.name === studentName ||
              (h as { receiverId?: string }).receiverId === studentId
          );
          setHints(forStudent);
        }
      })
      .catch(() => {});
  }, [soalId, studentName, studentId]);

  function addHint() {
    const t = hintDraft.trim();
    if (!t || sending) return;
    setSending(true);
    fetch("/api/hints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiverId: studentId,
        soalId,
        message: t,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setHints((prev) => [data, ...prev]);
          setHintDraft("");
        }
      })
      .catch(() => {})
      .finally(() => setSending(false));
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
          Soal {soalNum}
        </div>

        <div className="text-[12px] font-semibold mb-2">Petunjuk terkirim</div>

        {hints.length === 0 ? (
          <div className="text-[12.5px] text-text-dim mb-3.5 py-4 text-center border border-dashed border-line">
            Belum ada petunjuk untuk siswa ini pada soal ini.
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-3.5">
            {hints.map((h, i) => (
              <div
                key={h.id || i}
                className="flex gap-2.5 p-3 border border-line text-[12.5px] bg-white"
              >
                <span className="w-6 h-6 rounded-full bg-pcb text-white text-[11px] font-bold flex items-center justify-center flex-none">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="leading-relaxed">{h.message}</div>
                  <div className="mt-1 text-[11px] text-text-dim">
                    {h.readAt ? "✓ Sudah dibaca" : "Belum dibaca"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
            className={cn(
              "px-4 py-2 bg-pcb text-white text-[13px] font-medium whitespace-nowrap",
              sending ? "opacity-50" : "hover:opacity-90"
            )}
            onClick={addHint}
            disabled={sending}
          >
            Kirim hint
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────── */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-[13.5px] text-text-dim border border-dashed border-line">
      {message}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */

export default function RekapPage() {
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string | null>(null);
  const [rekapData, setRekapData] = useState<RekapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rekapLoading, setRekapLoading] = useState(false);

  const [activeModel, setActiveModel] = useState<SoalModel>("PROBLEM_SOLVING");
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [hintPanel, setHintPanel] = useState<HintPanelState | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [flagBusy, setFlagBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/kelas")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setKelasList(data);
          if (data.length > 0) setSelectedKelasId(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchRekap = useCallback((kelasId: string) => {
    setRekapLoading(true);
    setRekapData(null);
    setFlagged(new Set());
    fetch(`/api/kelas/${kelasId}/rekap`)
      .then((r) => r.json())
      .then((data) => {
        if (data.kelas) setRekapData(data);
      })
      .catch(() => {})
      .finally(() => setRekapLoading(false));
    fetch(`/api/teacher-flag?classId=${kelasId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.stuck)) {
          setFlagged(new Set(data.stuck));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedKelasId) fetchRekap(selectedKelasId);
  }, [selectedKelasId, fetchRekap]);

  const dashboard = rekapData ? buildDashboardData(rekapData) : null;

  const modelCounts = dashboard?.modelCounts ?? {
    PROBLEM_SOLVING: 0,
    PBL: 0,
    TRANSFORMATIF: 0,
    DEEP_LEARNING: 0,
  };
  const modelSoalIndices = dashboard?.modelSoalIndices ?? {
    PROBLEM_SOLVING: [],
    PBL: [],
    TRANSFORMATIF: [],
    DEEP_LEARNING: [],
  };
  const students = dashboard?.students ?? [];
  const pblMilestones = dashboard?.pblMilestones ?? [];
  const dlLayers = dashboard?.dlLayers ?? [];
  const pblData = dashboard?.pblData ?? {};
  const trfData = dashboard?.trfData ?? {};
  const dlData = dashboard?.dlData ?? {};
  const errorPatterns = rekapData?.errorPatterns ?? [];

  useEffect(() => {
    if (!dashboard) return;
    const nonZero = MODEL_TABS.filter((t) => modelCounts[t.id] > 0);
    if (nonZero.length === 0) return;
    if (modelCounts[activeModel] > 0) return;
    let best = nonZero[0];
    for (const t of nonZero) {
      if (modelCounts[t.id] > modelCounts[best.id]) best = t;
    }
    setActiveModel(best.id);
  }, [dashboard, modelCounts, activeModel]);

  function handleModelChange(model: SoalModel) {
    if (modelCounts[model] === 0) return;
    setActiveModel(model);
    setOpenDetail(null);
  }

  function toggleFlag(studentId: string, soalId: string) {
    const key = `${studentId}::${soalId}`;
    if (flagBusy.has(key)) return;
    const isCurrentlyFlagged = flagged.has(key);
    const value = isCurrentlyFlagged ? "ok" : "stuck";

    setFlagBusy((prev) => new Set(prev).add(key));
    fetch("/api/teacher-flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        soalId,
        classId: selectedKelasId,
        value,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.value === "stuck") {
          setFlagged((prev) => new Set(prev).add(key));
        } else {
          setFlagged((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      })
      .catch(() => {})
      .finally(() =>
        setFlagBusy((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        })
      );
  }

  function getPSStats(s: StudentRow) {
    const indices = modelSoalIndices.PROBLEM_SOLVING;
    const statuses = indices.map((i) => s.soalStatus[i]);
    const done = statuses.filter(
      (st) => st === "benar" || st === "salah"
    ).length;

    // Single source of truth: avg from Submission scores, not pass rate
    const subs = rekapData
      ? rekapData.students
          .find((st) => st.id === s.id)
          ?.submissions.filter(
            (_, i) =>
              indices.includes(i) &&
              (rekapData.students
                .find((st) => st.id === s.id)
                ?.submissions[i]?.status === "SUBMITTED" ||
                rekapData.students
                  .find((st) => st.id === s.id)
                  ?.submissions[i]?.status === "GRADED")
          ) ?? []
      : [];
    const scores = subs
      .map((sub) => sub.totalScore ?? sub.autoGradeScore)
      .filter((sc): sc is number => sc != null);
    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    return { done, total: indices.length, avg };
  }

  const innerTabs =
    activeModel === "TRANSFORMATIF"
      ? [{ id: "persiswa", label: "Per Siswa" }]
      : [
          { id: "persiswa", label: "Per Siswa" },
          { id: "pola", label: "Pola Kesalahan Kelas" },
        ];

  const selectedKelas = kelasList.find((k) => k.id === selectedKelasId);

  // --- Loading state ---
  if (loading) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-[20px] font-semibold mb-1">Rekap nilai siswa</h1>
        <div className="py-16 text-center text-[13.5px] text-text-dim">
          Memuat data kelas...
        </div>
      </div>
    );
  }

  // --- No classes ---
  if (kelasList.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-[20px] font-semibold mb-1">Rekap nilai siswa</h1>
        <EmptyState message="Belum ada kelas. Buat kelas terlebih dahulu di menu Kelola Kelas." />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-[20px] font-semibold mb-1">Rekap nilai siswa</h1>

      {/* ── Kelas selector ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <select
          value={selectedKelasId ?? ""}
          onChange={(e) => {
            setSelectedKelasId(e.target.value);
            setOpenDetail(null);
          }}
          className="border border-line bg-white px-3 py-1.5 text-[13.5px] text-text-primary"
        >
          {kelasList.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        {selectedKelas && (
          <span className="text-[13.5px] text-text-dim">
            {selectedKelas._count.members} siswa &middot;{" "}
            {selectedKelas._count.assignments} soal
          </span>
        )}
      </div>

      {/* ── Rekap loading ───────────────────────────────────────── */}
      {rekapLoading && (
        <div className="py-16 text-center text-[13.5px] text-text-dim">
          Memuat rekap...
        </div>
      )}

      {/* ── No soal assigned ────────────────────────────────────── */}
      {!rekapLoading && rekapData && rekapData.soalList.length === 0 && (
        <EmptyState message="Belum ada soal yang ditugaskan ke kelas ini." />
      )}

      {/* ── No students ─────────────────────────────────────────── */}
      {!rekapLoading &&
        rekapData &&
        rekapData.soalList.length > 0 &&
        students.length === 0 && (
          <EmptyState message="Belum ada siswa yang bergabung di kelas ini." />
        )}

      {/* ── Dashboard content ───────────────────────────────────── */}
      {!rekapLoading && rekapData && students.length > 0 && (
        <>
          {/* ── Model selector tabs ──────────────────────────────── */}
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
                      disabled
                        ? "text-text-dim/30"
                        : isActive
                          ? "text-copper"
                          : "text-text-dim"
                    )}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Inner tabs: Per Siswa / Pola Kesalahan ────────────── */}
          <Tabs key={activeModel} tabs={innerTabs}>
            {(innerTab) =>
              innerTab === "persiswa" ? (
                <div className="border border-line overflow-x-auto">
                  {/* ── Table header — per model ──────────────────── */}
                  {activeModel === "PROBLEM_SOLVING" && (
                    <div className="grid grid-cols-[2fr_1fr_1.6fr_.7fr_.8fr_1fr] min-w-[680px] px-4 py-2.5 text-[11px] uppercase tracking-widest text-text-dim font-semibold bg-paper-dim border-b border-line">
                      <span>Nama</span>
                      <span>Soal dikerjakan</span>
                      <span>Rata-rata nilai</span>
                      <span>Lama di soal</span>
                      <span>Status</span>
                      <span>Tandai</span>
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
                  {students.length === 0 && (
                    <div className="px-4 py-8 text-center text-[13px] text-text-dim">
                      Belum ada data siswa.
                    </div>
                  )}
                  {students.map((s) => {
                    const isOpen = openDetail === s.id;
                    const prio = calcPrio(s);
                    const pt = prio > 0 ? prioTag(prio) : null;

                    return (
                      <div key={s.id} className="border-b border-line">
                        {/* ── PS row ──────────────────────────────── */}
                        {activeModel === "PROBLEM_SOLVING" &&
                          (() => {
                            const ps = getPSStats(s);
                            const psIndices = modelSoalIndices.PROBLEM_SOLVING;
                            const activeSoalIdx = psIndices.find(
                              (i) => s.soalStatus[i] === "proses"
                            );
                            const activeSoal =
                              activeSoalIdx != null
                                ? rekapData?.soalList[activeSoalIdx]
                                : undefined;
                            const flagKey = activeSoal
                              ? `${s.id}::${activeSoal.soalId}`
                              : "";
                            const isFlagged = flagKey
                              ? flagged.has(flagKey)
                              : false;
                            const isBusy = flagKey
                              ? flagBusy.has(flagKey)
                              : false;
                            return (
                              <div
                                className="grid grid-cols-[2fr_1fr_1.6fr_.7fr_.8fr_1fr] min-w-[680px] px-4 py-3 text-[13.5px] cursor-pointer items-center hover:bg-paper-dim/50"
                                onClick={() =>
                                  setOpenDetail(isOpen ? null : s.id)
                                }
                              >
                                <span className="flex items-center gap-1.5">
                                  {s.name}
                                  {s.hand && (
                                    <span className="text-[14px]">
                                      &#9995;
                                    </span>
                                  )}
                                  {(s.hand ||
                                    (ENABLE_AUTO_STUCK && s.autoStuck)) &&
                                    pt && (
                                      <span
                                        className={cn(
                                          "text-[10px] font-semibold px-1.5 py-0.5 border whitespace-nowrap",
                                          pt.bg,
                                          pt.color
                                        )}
                                      >
                                        {pt.label} &middot;{" "}
                                        {s.hand
                                          ? "angkat tangan"
                                          : "terdeteksi"}
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
                                      style={{
                                        width: `${Math.round(ps.avg * 0.9)}%`,
                                      }}
                                    />
                                  </span>
                                  <span className="font-mono text-[13px] font-medium">
                                    {ps.avg}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    "font-mono text-[12.5px]",
                                    s.hp.timeLeft != null &&
                                      s.hp.timeLeft <= 15
                                      ? "text-rust"
                                      : "text-text-dim"
                                  )}
                                >
                                  {s.hp.timeLeft != null
                                    ? `${s.hp.timeLeft}m`
                                    : "—"}
                                </span>
                                <span
                                  className={cn(
                                    "text-[12.5px] font-mono",
                                    s.status === "selesai"
                                      ? "text-pcb"
                                      : "text-amber"
                                  )}
                                >
                                  {s.status}
                                </span>
                                <span>
                                  {activeSoal ? (
                                    <button
                                      className={cn(
                                        "min-h-[44px] min-w-[44px] px-3 py-2 text-[12.5px] font-semibold border-2 rounded transition-colors",
                                        isFlagged
                                          ? "bg-rust text-white border-rust"
                                          : "bg-transparent text-text-dim border-line hover:border-rust hover:text-rust",
                                        isBusy && "opacity-50 cursor-wait"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFlag(s.id, activeSoal.soalId);
                                      }}
                                      disabled={isBusy}
                                    >
                                      {isFlagged ? "✕ Buntu" : "Tandai buntu"}
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-text-dim">
                                      —
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })()}

                        {/* ── PBL row ─────────────────────────────── */}
                        {activeModel === "PBL" &&
                          (() => {
                            const d = pblData[s.id];
                            if (!d) return null;
                            return (
                              <div
                                className="grid grid-cols-[2fr_1fr_1.5fr_.8fr] min-w-[520px] px-4 py-3 text-[13.5px] cursor-pointer items-center hover:bg-paper-dim/50"
                                onClick={() =>
                                  setOpenDetail(isOpen ? null : s.id)
                                }
                              >
                                <span className="flex items-center gap-1.5">
                                  {s.name}
                                  {s.hand && (
                                    <span className="text-[14px]">
                                      &#9995;
                                    </span>
                                  )}
                                  {s.hand && pt && (
                                    <span
                                      className={cn(
                                        "text-[10px] font-semibold px-1.5 py-0.5 border whitespace-nowrap",
                                        pt.bg,
                                        pt.color
                                      )}
                                    >
                                      {pt.label} &middot; angkat tangan
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
                                  {d.reached}/{d.total}
                                </span>
                                <span className="text-[13px]">
                                  {d.lastApproved}
                                </span>
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
                            if (!d) return null;
                            return (
                              <div
                                className="grid grid-cols-[2fr_1fr_1.2fr_1fr] min-w-[520px] px-4 py-3 text-[13.5px] cursor-pointer items-center hover:bg-paper-dim/50"
                                onClick={() =>
                                  setOpenDetail(isOpen ? null : s.id)
                                }
                              >
                                <span className="flex items-center gap-1.5">
                                  {s.name}
                                  {s.hand && (
                                    <span className="text-[14px]">
                                      &#9995;
                                    </span>
                                  )}
                                  {s.hand && pt && (
                                    <span
                                      className={cn(
                                        "text-[10px] font-semibold px-1.5 py-0.5 border whitespace-nowrap",
                                        pt.bg,
                                        pt.color
                                      )}
                                    >
                                      {pt.label} &middot; angkat tangan
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
                                  {d.refleksiSent}/{d.refleksiTotal}
                                </span>
                                <span
                                  className={cn(
                                    "text-[12.5px] font-mono",
                                    d.penilaian === "dinilai"
                                      ? "text-pcb"
                                      : "text-amber"
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
                            if (!d) return null;
                            return (
                              <div
                                className="grid grid-cols-[2fr_1.2fr_2fr_.6fr] min-w-[580px] px-4 py-3 text-[13.5px] cursor-pointer items-center hover:bg-paper-dim/50"
                                onClick={() =>
                                  setOpenDetail(isOpen ? null : s.id)
                                }
                              >
                                <span className="flex items-center gap-1.5">
                                  {s.name}
                                  {s.hand && (
                                    <span className="text-[14px]">
                                      &#9995;
                                    </span>
                                  )}
                                  {s.hand && pt && (
                                    <span
                                      className={cn(
                                        "text-[10px] font-semibold px-1.5 py-0.5 border whitespace-nowrap",
                                        pt.bg,
                                        pt.color
                                      )}
                                    >
                                      {pt.label} &middot; angkat tangan
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
                                <span className="text-[13px]">
                                  {d.lapisan}
                                </span>
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
                            {s.live && (
                              <div className="text-[12.5px] text-text-dim mb-3">
                                Diperbarui real-time — sedang dikerjakan.
                              </div>
                            )}
                            {s.hand && (
                              <div className="bg-amber-soft border border-amber px-3 py-2 mb-3 text-[12.5px] text-amber flex items-center gap-2">
                                <span className="text-[16px]">&#9995;</span>
                                Siswa mengangkat tangan — klik soal untuk
                                membantu.
                              </div>
                            )}
                            {ENABLE_AUTO_STUCK && !s.hand && s.autoStuck && (
                              <div className="bg-rust-soft border border-rust px-3 py-2 mb-3 text-[12.5px] text-rust flex items-center gap-2">
                                <span className="text-[14px]">&#9888;</span>
                                Terdeteksi kebuntuan otomatis — klik soal untuk
                                membantu.
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
                                const soal = rekapData?.soalList[idx];
                                const flagKey = soal
                                  ? `${s.id}::${soal.soalId}`
                                  : "";
                                const isFlagged = flagged.has(flagKey);
                                const isFlagBusy = flagBusy.has(flagKey);
                                return (
                                  <div
                                    key={idx}
                                    className="flex flex-col items-center gap-1.5"
                                  >
                                    <div
                                      className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center font-mono text-[12.5px] font-semibold border-[1.5px]",
                                        soalColors[st],
                                        isClickable &&
                                          "cursor-pointer hover:ring-2 hover:ring-amber/50"
                                      )}
                                      onClick={(e) => {
                                        if (isClickable && soal) {
                                          e.stopPropagation();
                                          setHintPanel({
                                            studentId: s.id,
                                            studentName: s.name,
                                            soalId: soal.soalId,
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
                                    {soal && (
                                      <button
                                        className={cn(
                                          "min-h-[36px] px-2 py-1 text-[11px] font-semibold border-2 rounded transition-colors cursor-pointer",
                                          isFlagged
                                            ? "bg-rust text-white border-rust"
                                            : "bg-transparent text-text-dim border-line hover:border-rust hover:text-rust",
                                          isFlagBusy && "opacity-50 cursor-wait"
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleFlag(s.id, soal.soalId);
                                        }}
                                        disabled={isFlagBusy}
                                      >
                                        {isFlagged ? "✕ Buntu" : "Tandai"}
                                      </button>
                                    )}
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
                            if (!d) return null;
                            return (
                              <div className="bg-paper-dim p-4 border-t border-line">
                                {s.hand && (
                                  <div className="bg-amber-soft border border-amber px-3 py-2 mb-3 text-[12.5px] text-amber flex items-center gap-2">
                                    <span className="text-[16px]">
                                      &#9995;
                                    </span>
                                    Siswa mengangkat tangan.
                                  </div>
                                )}
                                <div className="text-[12px] font-semibold mb-2">
                                  Progres milestone
                                </div>
                                {pblMilestones.length === 0 ? (
                                  <div className="text-[12.5px] text-text-dim">
                                    Belum ada milestone yang dikonfigurasi.
                                  </div>
                                ) : (
                                  <div className="flex gap-1.5 items-center flex-wrap">
                                    {pblMilestones.map((m, i) => {
                                      const done = i < d.reached;
                                      const current =
                                        i === d.reached &&
                                        d.reached < d.total;
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
                                            {done
                                              ? "✓"
                                              : current
                                                ? "●"
                                                : "○"}{" "}
                                            {m}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                        {/* ── TRF detail panel ────────────────────── */}
                        {isOpen &&
                          activeModel === "TRANSFORMATIF" &&
                          (() => {
                            const d = trfData[s.id];
                            if (!d) return null;
                            return (
                              <div className="bg-paper-dim p-4 border-t border-line">
                                {s.hand && (
                                  <div className="bg-amber-soft border border-amber px-3 py-2 mb-3 text-[12.5px] text-amber flex items-center gap-2">
                                    <span className="text-[16px]">
                                      &#9995;
                                    </span>
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
                            if (!d) return null;
                            return (
                              <div className="bg-paper-dim p-4 border-t border-line">
                                {s.hand && (
                                  <div className="bg-amber-soft border border-amber px-3 py-2 mb-3 text-[12.5px] text-amber flex items-center gap-2">
                                    <span className="text-[16px]">
                                      &#9995;
                                    </span>
                                    Siswa mengangkat tangan.
                                  </div>
                                )}
                                <div className="text-[12px] font-semibold mb-2">
                                  Skor per lapisan
                                </div>
                                {dlLayers.length === 0 ? (
                                  <div className="text-[12.5px] text-text-dim">
                                    Belum ada data lapisan.
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    {dlLayers.map((layer, i) => {
                                      const skor = d.skor[i] ?? null;
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
                                                style={{
                                                  width: `${skor}%`,
                                                }}
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
                                )}
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
                  {errorPatterns.length === 0 ? (
                    <EmptyState message="Belum ada pola kesalahan yang terdeteksi." />
                  ) : (
                    errorPatterns.map((p, i) => (
                      <div
                        key={i}
                        className="border border-line bg-white p-[18px]"
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-semibold text-[14px]">
                            {p.soalTitle} — {p.conceptTagName}
                          </span>
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
                          {p.studentCount} dari {p.totalStudents} siswa
                          mengalami kesalahan pada konsep ini.
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )
            }
          </Tabs>
        </>
      )}

      {/* Hint Panel Modal */}
      {hintPanel && (
        <HintPanel
          studentId={hintPanel.studentId}
          studentName={hintPanel.studentName}
          soalId={hintPanel.soalId}
          soalNum={hintPanel.soalNum}
          onClose={() => setHintPanel(null)}
        />
      )}
    </div>
  );
}

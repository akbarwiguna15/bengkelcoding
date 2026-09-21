"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Step = "kelas" | "materi" | "model" | "metode" | "manual" | "ai-review";
type LearningModel = "PROBLEM_SOLVING" | "PBL" | "TRANSFORMATIF" | "DEEP_LEARNING";

interface AIDraft {
  id: string;
  title: string;
  body: string;
  codeBlock?: string;
  rubrik: string;
  accepted: boolean | null;
}

interface AICorrection {
  hasIssue: boolean;
  message: string;
  suggestion?: string;
}

const kelasList = [
  { id: "x-rpl-1", name: "X RPL 1", siswa: 30 },
  { id: "x-rpl-2", name: "X RPL 2", siswa: 28 },
  { id: "xi-rpl-1", name: "XI RPL 1", siswa: 32 },
  { id: "xi-rpl-2", name: "XI RPL 2", siswa: 28 },
  { id: "xii-rpl-1", name: "XII RPL 1", siswa: 26 },
  { id: "xii-rpl-2", name: "XII RPL 2", siswa: 24 },
];

const materiByTingkat: Record<string, string[]> = {
  "Kelas X": [
    "HTML Dasar",
    "CSS Dasar",
    "Pengenalan Algoritma",
    "Logika Pemrograman",
  ],
  "Kelas XI": [
    "CSS Layout & Flexbox",
    "JavaScript Dasar",
    "DOM & Event",
    "Responsive Design",
  ],
  "Kelas XII": [
    "JavaScript Lanjutan",
    "Framework Frontend",
    "Studi Kasus Web",
    "Proyek Akhir",
  ],
};

const models = [
  {
    id: "PROBLEM_SOLVING" as const,
    name: "Problem Solving",
    desc: "Soal berupa kasus/bug yang harus dipecahkan siswa memakai logika pemrograman bertahap.",
    tag: "Studi kasus",
    color: "pcb" as const,
  },
  {
    id: "PBL" as const,
    name: "Project Based Learning",
    desc: "Soal berbentuk potongan proyek nyata yang dikerjakan bertahap hingga jadi satu output utuh.",
    tag: "Multi-tahap",
    color: "copper" as const,
  },
  {
    id: "TRANSFORMATIF" as const,
    name: "Transformatif",
    desc: "Soal reflektif yang mendorong siswa mengaitkan konsep dengan pengalaman nyata di luar kelas.",
    tag: "1 konsep / soal",
    color: "reflect" as const,
  },
  {
    id: "DEEP_LEARNING" as const,
    name: "Deep Learning",
    desc: "Soal berlapis yang menuntun siswa dari memahami konsep, menganalisis, mengevaluasi, hingga mencipta solusi sendiri.",
    tag: "4 lapisan analisis",
    color: "ocean" as const,
  },
];

const modelColorMap: Record<LearningModel, string> = {
  PROBLEM_SOLVING: "pcb",
  PBL: "copper",
  TRANSFORMATIF: "reflect",
  DEEP_LEARNING: "ocean",
};

const demoAIDrafts: Record<LearningModel, AIDraft[]> = {
  PROBLEM_SOLVING: [
    {
      id: "ai-1",
      title: "Memperbaiki Navigasi Flexbox",
      body: "Menu navigasi pada situs latihan tampil menumpuk tidak rata. Perbaiki kode Flexbox berikut supaya 4 menu tersusun rata kanan-kiri (space-between), tanpa mengubah struktur HTML.",
      codeBlock: `.navbar {\n  display: flex;\n  justify-content: /* lengkapi */;\n}`,
      rubrik: "Dinilai otomatis lewat test-case pass/fail. Tiap kriteria diberi tag konsep supaya bisa masuk ke Pola Kesalahan Kelas.",
      accepted: null,
    },
    {
      id: "ai-2",
      title: "Debug Perhitungan Loop",
      body: "Fungsi berikut seharusnya menghitung total harga dari array produk, tetapi hasilnya selalu 0. Temukan dan perbaiki bug-nya.",
      codeBlock: `function hitungTotal(produk) {\n  let total = 0;\n  for (let i = 0; i <= produk.length; i++) {\n    total += produk[i].harga;\n  }\n  return total;\n}`,
      rubrik: "Dinilai otomatis: siswa harus menemukan off-by-one error pada kondisi loop (i <= harus i <).",
      accepted: null,
    },
  ],
  PBL: [
    {
      id: "ai-3",
      title: "Galeri Foto Responsif",
      body: "Buat galeri foto responsif menggunakan CSS Grid. Proyek dikerjakan dalam 3 tahap: (1) Struktur HTML dasar, (2) Layout Grid 3 kolom, (3) Media query untuk tampilan mobile.",
      rubrik: "Dinilai bertahap per milestone. Siswa lanjut ke tahap berikutnya setelah tahap sebelumnya disetujui guru.",
      accepted: null,
    },
  ],
  TRANSFORMATIF: [
    {
      id: "ai-4",
      title: "Refleksi: Pengalaman Memakai Aplikasi",
      body: "Ceritakan satu aplikasi atau website yang sering kamu pakai sehari-hari. Bagian mana dari tampilannya yang paling nyaman digunakan? Kaitkan dengan konsep UI/UX yang sudah dipelajari.",
      rubrik: "Tidak ada skor otomatis — dinilai manual oleh guru memakai skala kualitatif: Belum mengaitkan / Cukup mengaitkan / Mengaitkan dengan baik.",
      accepted: null,
    },
  ],
  DEEP_LEARNING: [
    {
      id: "ai-5",
      title: "Analisis Mendalam: Flexbox vs Grid",
      body: "Analisis mendalam tentang tata letak CSS: mulai dari memahami konsep dasar flex container, menganalisis perbedaan justify-content dan align-items, mengevaluasi kapan memakai Flexbox vs Grid, lalu mencipta layout responsif yang menggabungkan keduanya.",
      codeBlock: `/* Lapisan 1: Memahami */\n.container { display: flex; }\n\n/* Lapisan 2: Menganalisis */\n/* Jelaskan perbedaan justify-content vs align-items */\n\n/* Lapisan 3: Mengevaluasi */\n/* Kapan lebih tepat memakai Grid? */\n\n/* Lapisan 4: Mencipta */\n/* Buat layout responsif gabungan */`,
      rubrik: "Dinilai per lapisan analisis (Memahami → Menganalisis → Mengevaluasi → Mencipta). Tiap lapisan punya bobot skor tersendiri.",
      accepted: null,
    },
  ],
};

const stepLabels: Record<Step, string> = {
  kelas: "Pilih kelas",
  materi: "Pilih materi",
  model: "Model pembelajaran",
  metode: "Metode pembuatan",
  manual: "Tulis soal",
  "ai-review": "Review soal AI",
};

export default function BuatSoalPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("kelas");
  const [selectedKelas, setSelectedKelas] = useState<string | null>(null);
  const [selectedMateri, setSelectedMateri] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<LearningModel | null>(null);
  const [loading, setLoading] = useState(false);

  // Manual form
  const [manualTitle, setManualTitle] = useState("");
  const [manualBody, setManualBody] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [correction, setCorrection] = useState<AICorrection | null>(null);
  const [correcting, setCorrecting] = useState(false);

  // AI drafts
  const [aiDrafts, setAiDrafts] = useState<AIDraft[]>([]);
  const [generating, setGenerating] = useState(false);

  const stepOrder: Step[] = ["kelas", "materi", "model", "metode"];
  const currentIdx = stepOrder.indexOf(step);

  function goBack() {
    if (step === "manual" || step === "ai-review") {
      setStep("metode");
      setCorrection(null);
      return;
    }
    if (currentIdx > 0) setStep(stepOrder[currentIdx - 1]);
  }

  function toggleMateri(topic: string) {
    setSelectedMateri((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  function handleChooseManual() {
    setStep("manual");
  }

  function handleChooseAI() {
    setGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setAiDrafts(
        (demoAIDrafts[selectedModel!] || []).map((d) => ({ ...d, accepted: null }))
      );
      setGenerating(false);
      setStep("ai-review");
    }, 1500);
  }

  function handleValidateManual() {
    setCorrecting(true);
    // Simulate AI validation
    setTimeout(() => {
      const modelName = models.find((m) => m.id === selectedModel)?.name;
      const bodyLower = manualBody.toLowerCase();
      const isReflective = bodyLower.includes("refleksi") || bodyLower.includes("ceritakan") || bodyLower.includes("pengalaman");
      const isProblemSolving = bodyLower.includes("perbaiki") || bodyLower.includes("debug") || bodyLower.includes("bug");

      let hasIssue = false;
      let message = "";
      let suggestion: string | undefined;

      if (selectedModel === "PROBLEM_SOLVING" && isReflective && !isProblemSolving) {
        hasIssue = true;
        message = `Soal ini terdeteksi lebih cocok sebagai model Transformatif (reflektif), bukan ${modelName}. Model Problem Solving memerlukan kasus/bug nyata yang harus dipecahkan.`;
        suggestion = "Ubah soal menjadi studi kasus: berikan potongan kode dengan bug yang harus ditemukan dan diperbaiki oleh siswa.";
      } else if (selectedModel === "TRANSFORMATIF" && isProblemSolving && !isReflective) {
        hasIssue = true;
        message = `Soal ini terdeteksi lebih cocok sebagai model Problem Solving, bukan ${modelName}. Model Transformatif memerlukan refleksi pengalaman nyata.`;
        suggestion = "Ubah soal agar siswa mengaitkan konsep pemrograman dengan pengalaman sehari-hari mereka.";
      } else {
        message = `Soal sesuai dengan model ${modelName}. Struktur dan rubrik sudah tepat.`;
      }

      setCorrection({ hasIssue, message, suggestion });
      setCorrecting(false);
    }, 1200);
  }

  function acceptDraft(id: string) {
    setAiDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, accepted: true } : d))
    );
  }

  function rejectDraft(id: string) {
    setAiDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, accepted: false } : d))
    );
  }

  function handleFinishAIReview() {
    const accepted = aiDrafts.filter((d) => d.accepted === true);
    if (accepted.length === 0) return;
    setLoading(true);
    // In production: POST accepted drafts to /api/soal
    setTimeout(() => {
      setLoading(false);
      router.push("/guru/soal");
    }, 800);
  }

  function handleSubmitManual() {
    setLoading(true);
    // In production: POST to /api/soal
    setTimeout(() => {
      setLoading(false);
      router.push("/guru/soal");
    }, 800);
  }

  const completedSteps = stepOrder.slice(0, currentIdx);
  const isWizardStep = stepOrder.includes(step);

  return (
    <div className="animate-fade-in">
      {/* Stepper */}
      <div className="flex items-center gap-0 mb-6">
        {stepOrder.map((s, i) => {
          const isDone = completedSteps.includes(s);
          const isCurrent = step === s || (step === "manual" && s === "metode") || (step === "ai-review" && s === "metode");
          return (
            <div key={s} className="flex items-center gap-0">
              <div className="text-center">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center mx-auto mb-1 font-mono text-[11px] font-semibold",
                    isDone
                      ? "bg-pcb border-pcb text-white"
                      : isCurrent
                      ? "bg-copper border-copper text-white"
                      : "bg-white border-line text-text-dim"
                  )}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span className="text-[10px] text-text-dim whitespace-nowrap">
                  {stepLabels[s]}
                </span>
              </div>
              {i < stepOrder.length - 1 && (
                <div
                  className={cn(
                    "w-10 h-0.5 mt-[-12px] mx-1.5",
                    isDone ? "bg-pcb" : "bg-line"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Pilih Kelas */}
      {step === "kelas" && (
        <div>
          <h1 className="text-[20px] font-semibold mb-1">Pilih kelas</h1>
          <p className="text-[13.5px] text-text-dim mb-5 max-w-[520px]">
            Soal yang dibuat akan ditugaskan ke kelas yang dipilih.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-[560px]">
            {kelasList.map((k) => (
              <button
                key={k.id}
                onClick={() => setSelectedKelas(k.id)}
                className={cn(
                  "border bg-white p-3.5 cursor-pointer text-left font-sans transition-colors",
                  selectedKelas === k.id
                    ? "border-pcb bg-pcb-soft border-[1.5px]"
                    : "border-line hover:border-pcb"
                )}
              >
                <div className="font-semibold text-[14px]">{k.name}</div>
                <div className="text-[12px] text-text-dim mt-0.5">
                  {k.siswa} siswa
                </div>
              </button>
            ))}
          </div>
          <Button
            onClick={() => setStep("materi")}
            disabled={!selectedKelas}
          >
            Lanjut ke materi →
          </Button>
        </div>
      )}

      {/* Step 2: Pilih Materi */}
      {step === "materi" && (
        <div>
          <h1 className="text-[20px] font-semibold mb-1">Pilih materi</h1>
          <p className="text-[13.5px] text-text-dim mb-5 max-w-[520px]">
            Materi dikelompokkan per tingkat kelas. Pilih satu atau lebih topik
            sebagai cakupan soal.
          </p>
          {Object.entries(materiByTingkat).map(([tingkat, topiks]) => (
            <div key={tingkat} className="mb-5">
              <div className="text-[12px] font-semibold text-text-dim uppercase tracking-wider mb-2">
                {tingkat}
              </div>
              <div className="flex flex-wrap gap-2">
                {topiks.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleMateri(t)}
                    className={cn(
                      "border bg-white px-3.5 py-2 text-[13px] cursor-pointer font-sans transition-colors",
                      selectedMateri.includes(t)
                        ? "bg-ink text-paper border-ink"
                        : "border-line hover:border-ink"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-4">
            <Button variant="ghost" onClick={goBack}>
              ← Kembali
            </Button>
            <Button
              onClick={() => setStep("model")}
              disabled={selectedMateri.length === 0}
            >
              Lanjut ke model →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Pilih Model */}
      {step === "model" && (
        <div>
          <h1 className="text-[20px] font-semibold mb-1">
            Pilih model pembelajaran
          </h1>
          <p className="text-[13.5px] text-text-dim mb-5 max-w-[520px]">
            Bentuk dan gaya soal menyesuaikan model yang dipilih. Setiap model
            punya cara penilaian yang berbeda.
          </p>
          <div className="grid grid-cols-2 gap-3.5 mb-6">
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={cn(
                  "border bg-white p-4 cursor-pointer text-left transition-colors font-sans",
                  selectedModel === m.id
                    ? "border-pcb bg-pcb-soft border-[1.5px]"
                    : "border-line hover:border-pcb"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-[14px]">{m.name}</div>
                </div>
                <div className="text-[12.5px] text-text-dim leading-relaxed">
                  {m.desc}
                </div>
                <span
                  className={cn(
                    "inline-block mt-2.5 text-[10.5px] font-mono bg-white border px-1.5 py-0.5",
                    `text-${m.color} border-${m.color}`
                  )}
                >
                  {m.tag}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={goBack}>
              ← Kembali
            </Button>
            <Button
              onClick={() => setStep("metode")}
              disabled={!selectedModel}
            >
              Lanjut →
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Pilih Metode */}
      {step === "metode" && (
        <div>
          <h1 className="text-[20px] font-semibold mb-1">
            Metode pembuatan soal
          </h1>
          <p className="text-[13.5px] text-text-dim mb-5 max-w-[520px]">
            Pilih apakah ingin menulis soal sendiri atau menerima rekomendasi
            soal dari AI yang disesuaikan dengan model{" "}
            <strong>{models.find((m) => m.id === selectedModel)?.name}</strong>.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-[560px] mb-6">
            <button
              onClick={handleChooseManual}
              className="border border-line bg-white p-5 cursor-pointer text-left font-sans hover:border-pcb transition-colors group"
            >
              <div className="w-10 h-10 rounded-full border-[1.5px] border-copper bg-copper-soft flex items-center justify-center mb-3 text-[18px]">
                ✎
              </div>
              <div className="font-semibold text-[14.5px] mb-1.5">
                Tulis soal sendiri
              </div>
              <div className="text-[12.5px] text-text-dim leading-relaxed">
                Buat soal manual. Sistem AI akan memeriksa kesesuaian soal
                dengan model pembelajaran yang dipilih dan memberi koreksi jika
                diperlukan.
              </div>
            </button>

            <button
              onClick={handleChooseAI}
              disabled={generating}
              className="border border-line bg-white p-5 cursor-pointer text-left font-sans hover:border-pcb transition-colors group disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-full border-[1.5px] border-pcb bg-pcb-soft flex items-center justify-center mb-3 text-[18px]">
                ✦
              </div>
              <div className="font-semibold text-[14.5px] mb-1.5">
                {generating ? "Membuat soal..." : "Terima soal dari AI"}
              </div>
              <div className="text-[12.5px] text-text-dim leading-relaxed">
                Sistem rekomendasi AI akan menghasilkan soal berdasarkan model{" "}
                {models.find((m) => m.id === selectedModel)?.name} dan materi
                yang dipilih. Guru tinggal review dan setujui.
              </div>
            </button>
          </div>

          <Button variant="ghost" onClick={goBack}>
            ← Kembali
          </Button>
        </div>
      )}

      {/* Step 5a: Manual — Tulis Soal */}
      {step === "manual" && (
        <div>
          <h1 className="text-[20px] font-semibold mb-1">Tulis soal</h1>
          <p className="text-[13.5px] text-text-dim mb-5 max-w-[520px]">
            Tulis soal untuk model{" "}
            <Badge
              variant={
                modelColorMap[selectedModel!] as
                  | "pcb"
                  | "copper"
                  | "reflect"
                  | "ocean"
              }
            >
              {models.find((m) => m.id === selectedModel)?.name}
            </Badge>
            . Setelah selesai, sistem AI akan memeriksa kesesuaian soal.
          </p>

          <div className="max-w-[600px]">
            <label className="block text-[13px] font-semibold mb-1.5">
              Judul soal
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Contoh: Memperbaiki Navigasi Flexbox"
              className="w-full border border-line bg-white px-3 py-2.5 text-[13.5px] font-sans mb-4 text-text-primary"
            />

            <label className="block text-[13px] font-semibold mb-1.5">
              Isi soal
            </label>
            <textarea
              value={manualBody}
              onChange={(e) => setManualBody(e.target.value)}
              placeholder="Tulis instruksi soal lengkap di sini..."
              className="w-full min-h-[120px] border border-line bg-white px-3 py-2.5 text-[13.5px] font-sans resize-y mb-4 text-text-primary"
            />

            <label className="block text-[13px] font-semibold mb-1.5">
              Kode awal{" "}
              <span className="font-normal text-text-dim">(opsional)</span>
            </label>
            <textarea
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Potongan kode yang akan dikerjakan siswa..."
              className="w-full min-h-[80px] border border-line bg-white px-3 py-2.5 text-[12.5px] font-mono resize-y mb-5 text-text-primary"
            />

            {/* AI Correction result */}
            {correction && (
              <div
                className={cn(
                  "border-l-[3px] px-4 py-3 mb-5 text-[13px] leading-relaxed",
                  correction.hasIssue
                    ? "bg-rust-soft border-rust"
                    : "bg-pcb-soft border-pcb"
                )}
              >
                <div className="font-semibold text-[12px] font-mono mb-1">
                  {correction.hasIssue
                    ? "⚠ TIDAK SESUAI MODEL"
                    : "✓ SESUAI MODEL"}
                </div>
                <div>{correction.message}</div>
                {correction.suggestion && (
                  <div className="mt-2 border-t border-line pt-2 text-[12.5px] text-text-dim">
                    <strong>Saran perbaikan:</strong> {correction.suggestion}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" onClick={goBack}>
                ← Kembali
              </Button>
              <Button
                variant="ghost"
                onClick={handleValidateManual}
                disabled={correcting || !manualBody.trim()}
              >
                {correcting ? "Memeriksa..." : "Periksa kesesuaian AI"}
              </Button>
              <Button
                onClick={handleSubmitManual}
                disabled={
                  loading || !manualTitle.trim() || !manualBody.trim()
                }
              >
                {loading
                  ? "Mengirim..."
                  : "Kirim ke verifikasi →"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5b: AI Review */}
      {step === "ai-review" && (
        <div>
          <h1 className="text-[20px] font-semibold mb-1">
            Review soal dari AI
          </h1>
          <p className="text-[13.5px] text-text-dim mb-5 max-w-[600px]">
            AI telah menghasilkan soal berdasarkan model{" "}
            <Badge
              variant={
                modelColorMap[selectedModel!] as
                  | "pcb"
                  | "copper"
                  | "reflect"
                  | "ocean"
              }
            >
              {models.find((m) => m.id === selectedModel)?.name}
            </Badge>{" "}
            dan materi <strong>{selectedMateri.join(", ")}</strong>. Setujui
            soal yang sesuai atau tolak untuk dibuang.
          </p>

          <div className="flex flex-col gap-3.5 mb-5">
            {aiDrafts.map((draft) => (
              <Card
                key={draft.id}
                className={cn(
                  "p-[18px_20px] transition-opacity",
                  draft.accepted === false && "opacity-40"
                )}
              >
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div className="font-semibold text-[14.5px]">
                    {draft.title}
                  </div>
                  {draft.accepted === true && (
                    <span className="text-[11px] font-mono font-semibold text-pcb bg-pcb-soft px-2 py-0.5">
                      ✓ DITERIMA
                    </span>
                  )}
                  {draft.accepted === false && (
                    <span className="text-[11px] font-mono font-semibold text-rust bg-rust-soft px-2 py-0.5">
                      ✕ DITOLAK
                    </span>
                  )}
                </div>

                <div className="text-[13.5px] leading-relaxed mb-3 text-text-dim">
                  {draft.body}
                </div>

                {draft.codeBlock && (
                  <pre className="bg-ink text-[#d7e6dd] font-mono text-[12.5px] p-3 mb-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                    {draft.codeBlock}
                  </pre>
                )}

                <div className="border border-dashed border-line p-3 text-[12px] text-text-dim leading-relaxed mb-3">
                  <strong className="text-text-primary">Rubrik:</strong>{" "}
                  {draft.rubrik}
                </div>

                {draft.accepted === null && (
                  <div className="flex gap-2">
                    <Button
                      variant="approve"
                      onClick={() => acceptDraft(draft.id)}
                    >
                      Terima soal ini
                    </Button>
                    <Button
                      variant="reject"
                      onClick={() => rejectDraft(draft.id)}
                    >
                      Tolak
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={goBack}>
              ← Kembali
            </Button>
            <Button
              onClick={handleFinishAIReview}
              disabled={
                loading || aiDrafts.filter((d) => d.accepted === true).length === 0
              }
            >
              {loading
                ? "Mengirim..."
                : `Kirim ${aiDrafts.filter((d) => d.accepted === true).length} soal ke verifikasi →`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

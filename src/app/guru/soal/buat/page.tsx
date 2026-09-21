"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const models = [
  {
    id: "TRANSFORMATIF" as const,
    name: "Transformatif",
    desc: "Soal reflektif yang mendorong siswa mengaitkan konsep dengan pengalaman nyata di luar kelas.",
    tag: "1 konsep / soal",
  },
  {
    id: "PROBLEM_SOLVING" as const,
    name: "Problem Solving",
    desc: "Soal berupa kasus/bug yang harus dipecahkan siswa memakai logika pemrograman bertahap.",
    tag: "Studi kasus",
  },
  {
    id: "PBL" as const,
    name: "Project Based Learning",
    desc: "Soal berbentuk potongan proyek nyata yang dikerjakan bertahap hingga jadi satu output utuh.",
    tag: "Multi-tahap",
  },
  {
    id: "DEEP_LEARNING" as const,
    name: "Deep Learning",
    desc: "Soal berlapis yang menuntun siswa dari memahami konsep, menganalisis, mengevaluasi, hingga mencipta solusi sendiri.",
    tag: "4 lapisan analisis",
  },
];

const topics = [
  "HTML Dasar",
  "CSS Layout & Flexbox",
  "JavaScript Dasar",
  "DOM & Event",
  "Responsive Design",
  "Studi Kasus Web",
];

export default function BuatSoalPage() {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState("TRANSFORMATIF");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["CSS Layout & Flexbox"]);
  const [loading, setLoading] = useState(false);

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  async function handleGenerate() {
    setLoading(true);
    // In production: call /api/soal/generate, then redirect to verification
    setTimeout(() => {
      setLoading(false);
      router.push("/guru/soal");
    }, 1000);
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-[20px] font-semibold mb-1">
        Pilih model pembelajaran & materi
      </h1>
      <p className="text-[13.5px] text-text-dim mb-6 max-w-[520px]">
        Bentuk dan gaya soal menyesuaikan model pembelajaran yang dipilih. Soal
        tidak langsung tayang — akan masuk ke tahap verifikasi.
      </p>

      <div className="text-[13px] font-semibold mb-3">Model pembelajaran</div>
      <div className="grid grid-cols-2 gap-3.5 mb-7">
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
            <div className="font-semibold text-[14px] mb-1">{m.name}</div>
            <div className="text-[12.5px] text-text-dim leading-relaxed">
              {m.desc}
            </div>
            <span className="inline-block mt-2.5 text-[10.5px] font-mono text-pcb bg-white border border-pcb px-1.5 py-0.5">
              {m.tag}
            </span>
          </button>
        ))}
      </div>

      <div className="text-[13px] font-semibold mb-3">Materi</div>
      <div className="flex flex-wrap gap-2 mb-7">
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => toggleTopic(t)}
            className={cn(
              "border bg-white px-3.5 py-2 text-[13px] cursor-pointer font-sans",
              selectedTopics.includes(t)
                ? "bg-ink text-paper border-ink"
                : "border-line"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <Button onClick={handleGenerate} disabled={loading || selectedTopics.length === 0}>
        {loading ? "Membuat draf soal..." : "Buat draf soal →"}
      </Button>
    </div>
  );
}

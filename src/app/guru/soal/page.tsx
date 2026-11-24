"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface SoalItem {
  id: string;
  title: string;
  description: string;
  learningModel: string;
  topic: string;
  difficulty: number;
  status: string;
  starterCode: string | null;
  _count: { testCases: number; milestones: number; submissions: number };
}

const modelBadge: Record<string, { variant: "pcb" | "copper" | "reflect" | "ocean"; label: string }> = {
  PROBLEM_SOLVING: { variant: "pcb", label: "Problem Solving" },
  PBL: { variant: "copper", label: "Project Based Learning" },
  TRANSFORMATIF: { variant: "reflect", label: "Transformatif" },
  DEEP_LEARNING: { variant: "ocean", label: "Deep Learning" },
};

const diffLabel = (d: number) =>
  d <= 1 ? "Mudah" : d === 2 ? "Menengah" : "Sulit";

function statusToBadge(status: string): { variant: "pending" | "ok" | "revisi"; label?: string } {
  if (status === "APPROVED") return { variant: "ok", label: "disetujui — tayang" };
  if (status === "REVISION_NEEDED") return { variant: "revisi", label: "perlu revisi" };
  if (status === "ARCHIVED") return { variant: "revisi", label: "diarsipkan" };
  return { variant: "pending" };
}

export default function VerifikasiSoalPage() {
  const [soalList, setSoalList] = useState<SoalItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/soal");
      if (res.ok) {
        setSoalList(await res.json());
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function updateStatus(id: string, newStatus: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/soal/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setUpdating(null);
    }
  }

  if (!loaded) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-[20px] font-semibold mb-1">Verifikasi soal</h1>
        <p className="text-[13.5px] text-text-dim mb-6 max-w-[520px]">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-[20px] font-semibold mb-1">Verifikasi soal</h1>
      <p className="text-[13.5px] text-text-dim mb-6 max-w-[520px]">
        Soal baru tampil ke siswa setelah disetujui di sini. Edit langsung jika
        ada bagian yang kurang tepat.
      </p>

      {soalList.length === 0 ? (
        <Card className="p-8 text-center text-text-dim text-[13.5px]">
          Belum ada soal. Buat soal baru lewat menu &ldquo;Buat soal&rdquo;.
        </Card>
      ) : (
        <div className="flex flex-col gap-3.5">
          {soalList.map((soal) => {
            const badge = modelBadge[soal.learningModel] ?? {
              variant: "pcb" as const,
              label: soal.learningModel,
            };
            const sBadge = statusToBadge(soal.status);
            const isUpdating = updating === soal.id;

            return (
              <Card key={soal.id} className="p-[18px_20px]">
                <div className="flex justify-between items-start gap-4 mb-2.5">
                  <div className="flex items-center gap-3 text-[11.5px] text-text-dim flex-wrap">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <span>{soal.topic}</span>
                    <span>Sulit: {diffLabel(soal.difficulty)}</span>
                    <span className="text-line">|</span>
                    <span>
                      {soal._count.testCases} test · {soal._count.submissions} submission
                    </span>
                  </div>
                  <StatusBadge variant={sBadge.variant} label={sBadge.label} />
                </div>

                <div className="text-[15px] font-semibold mb-1">{soal.title}</div>
                <div className="text-[14px] leading-relaxed mb-3 text-text-dim">
                  {soal.description}
                </div>

                {soal.starterCode && (
                  <pre className="bg-ink text-[#d7e6dd] font-mono text-[12.5px] p-3 mb-3.5 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                    {soal.starterCode}
                  </pre>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="approve"
                    onClick={() => updateStatus(soal.id, "APPROVED")}
                    disabled={soal.status === "APPROVED" || isUpdating}
                  >
                    {isUpdating ? "Menyimpan..." : "Setujui & tayangkan"}
                  </Button>
                  <Button
                    variant="reject"
                    onClick={() => updateStatus(soal.id, "REVISION_NEEDED")}
                    disabled={isUpdating}
                  >
                    Tolak
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

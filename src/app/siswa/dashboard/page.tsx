"use client";

import { useState } from "react";
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

interface SoalItem {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  learningModel: string;
  status: "available" | "done" | "locked";
  score?: number;
  expanded?: boolean;
}

const modelBadge: Record<string, { variant: "pcb" | "copper" | "reflect" | "ocean"; label: string }> = {
  PROBLEM_SOLVING: { variant: "pcb", label: "Problem Solving" },
  PBL: { variant: "copper", label: "Project Based Learning" },
  TRANSFORMATIF: { variant: "reflect", label: "Transformatif" },
  DEEP_LEARNING: { variant: "ocean", label: "Deep Learning" },
};

const demoSoal: SoalItem[] = [
  { id: "1", title: "Navigasi Flexbox", difficulty: "Menengah", description: "Menyusun menu navigasi horizontal memakai Flexbox.", learningModel: "PROBLEM_SOLVING", status: "available" },
  { id: "2", title: "Fungsi Hitung Total", difficulty: "Mudah", description: "Menulis fungsi kalkulasi sederhana dengan dua parameter.", learningModel: "PROBLEM_SOLVING", status: "done", score: 90 },
  { id: "3", title: "Grid Galeri Foto", difficulty: "Sulit", description: "Menyusun galeri responsif memakai CSS Grid, dikerjakan bertahap per milestone.", learningModel: "PBL", status: "available" },
  { id: "4", title: "Validasi Form", difficulty: "Menengah", description: "Menambahkan validasi input kosong sebelum submit.", learningModel: "PBL", status: "locked" },
  { id: "5", title: "Refleksi: Aplikasi Favoritmu", difficulty: "Mudah", description: "Menulis refleksi pengalaman memakai sebuah aplikasi/website.", learningModel: "TRANSFORMATIF", status: "available" },
  { id: "6", title: "Analisis Mendalam: Flexbox vs Grid", difficulty: "Sulit", description: "Analisis berlapis dari memahami, menganalisis, mengevaluasi, hingga mencipta layout CSS.", learningModel: "DEEP_LEARNING", status: "available" },
];

function HandRaiseButton({ raised, onToggle }: { raised: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
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
      <span className="text-[16px] animate-pulse-slow inline-block">&#9995;</span>
      <span className="text-amber font-medium">Tangan diangkat — guru akan melihat permintaan bantuanmu.</span>
      <button
        onClick={onLower}
        className="ml-auto bg-transparent border border-amber text-amber font-sans text-[11px] px-2.5 py-0.5 cursor-pointer whitespace-nowrap"
      >
        Turunkan
      </button>
    </div>
  );
}

export default function LatihanPage() {
  const [soalList] = useState(demoSoal);
  const [activeEditor, setActiveEditor] = useState<string | null>(null);
  const [handRaised, setHandRaised] = useState(false);

  function openEditor(id: string) {
    setActiveEditor(id);
    setHandRaised(false);
  }

  function closeEditor() {
    setActiveEditor(null);
    setHandRaised(false);
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-[20px] font-semibold mb-1">Latihan</h1>
      <p className="text-[13.5px] text-text-dim mb-6">
        {activeEditor
          ? "Sedang mengerjakan — koreksi baris berjalan otomatis, nilai akhir dihitung saat kamu kirim jawaban."
          : "Kelas XI RPL 2 — pilih soal, editor akan terbuka langsung di kartu yang sama."}
      </p>

      <div className={cn("grid gap-3.5", !activeEditor && "grid-cols-2")}>
        {soalList.map((soal) => {
          if (activeEditor && activeEditor !== soal.id) return null;
          const badge = modelBadge[soal.learningModel];

          return (
            <div
              key={soal.id}
              className={cn(
                "border border-line bg-white p-[18px] flex flex-col gap-2.5",
                activeEditor === soal.id && "col-span-full"
              )}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-[14.5px] font-semibold m-0">{soal.title}</h3>
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
                {soal.status === "done" && (
                  <Button variant="ghost" className="py-2 px-4 text-[12.5px]">
                    Selesai · {soal.score}
                  </Button>
                )}
                {soal.status === "locked" && (
                  <Button variant="ghost" className="py-2 px-4 text-[12.5px] opacity-50" disabled>
                    Terkunci
                  </Button>
                )}
              </div>

              {/* Hand raised banner — shown for non-PS editors (PS has its own) */}
              {activeEditor === soal.id && handRaised && soal.learningModel !== "PROBLEM_SOLVING" && (
                <HandRaisedBanner onLower={() => setHandRaised(false)} />
              )}

              {/* Inline editor for Problem Solving — CodeMirror 6 + live preview */}
              {activeEditor === soal.id && soal.learningModel === "PROBLEM_SOLVING" && (
                <ProblemSolvingEditor
                  soalId={soal.id}
                  title="Instruksi"
                  instructions="Buat navigasi horizontal menggunakan Flexbox yang menyusun 4 menu secara rata kanan-kiri (space-between), tanpa mengubah struktur HTML yang tersedia."
                  criteria={[
                    'Elemen .navbar memakai display: flex',
                    'Menu tersusun rata dengan justify-content: space-between',
                    'Struktur HTML tidak diubah',
                  ]}
                  starterCode={`.navbar {\n  display: flex;\n  justify-content: ;\n}`}
                  starterHtml={`<nav class="navbar">\n  <a href="#">Beranda</a>\n  <a href="#">Tentang</a>\n  <a href="#">Layanan</a>\n  <a href="#">Kontak</a>\n</nav>`}
                  language="css"
                  fileName="navbar.css"
                  regime="silent"
                  relevantProps={["display", "flex-direction", "justify-content", "align-items", "gap"]}
                  studentId="demo-student"
                  classId="demo-class"
                  onClose={closeEditor}
                />
              )}

              {/* Inline editor for PBL */}
              {activeEditor === soal.id && soal.learningModel === "PBL" && (
                <div className="mt-4 border border-line bg-white">
                  <div className="flex justify-between items-center px-4 py-3.5 border-b border-line">
                    <strong className="text-[13.5px]">Proyek: {soal.title}</strong>
                    <div className="flex gap-1.5 items-center">
                      <HandRaiseButton raised={handRaised} onToggle={() => setHandRaised(!handRaised)} />
                      <button
                        onClick={closeEditor}
                        className="bg-transparent border border-line text-text-primary px-3 py-1.5 text-[12px] font-sans cursor-pointer"
                      >
                        ← Daftar soal
                      </button>
                    </div>
                  </div>
                  <div className="flex px-4 py-4 gap-2">
                    <div className="flex-1 text-center">
                      <div className="w-6.5 h-6.5 rounded-full bg-pcb border-[1.5px] border-pcb text-white flex items-center justify-center mx-auto mb-1.5 font-mono text-[12px]">✓</div>
                      <small className="text-[11px] text-text-dim">Struktur HTML</small>
                    </div>
                    <div className="flex-1 h-0.5 bg-pcb mt-3" />
                    <div className="flex-1 text-center">
                      <div className="w-6.5 h-6.5 rounded-full bg-copper border-[1.5px] border-copper text-white flex items-center justify-center mx-auto mb-1.5 font-mono text-[12px]">2</div>
                      <small className="text-[11px] text-text-dim">Layout Grid</small>
                    </div>
                    <div className="flex-1 h-0.5 bg-line mt-3" />
                    <div className="flex-1 text-center">
                      <div className="w-6.5 h-6.5 rounded-full bg-white border-[1.5px] border-line text-text-dim flex items-center justify-center mx-auto mb-1.5 font-mono text-[12px]">3</div>
                      <small className="text-[11px] text-text-dim">Responsif</small>
                    </div>
                  </div>
                  <div className="px-4 pb-5">
                    <h4 className="text-[13.5px] font-semibold mb-1.5">Tahap 2 dari 3 — Layout Grid</h4>
                    <p className="text-[12.5px] text-text-dim leading-relaxed mb-3.5">
                      Susun galeri menjadi 3 kolom sejajar memakai <code className="font-mono">display: grid</code>.
                      Tahap ini diperiksa guru sebelum kamu bisa lanjut ke tahap Responsif.
                    </p>
                    <pre className="bg-ink text-[#d7e6dd] font-mono text-[12.5px] p-3 mb-3.5 whitespace-pre-wrap">
{`.galeri {
  display: grid;
  grid-template-columns: `}<span className="inline-block w-1.5 h-3.5 bg-[#cfe0d6] align-text-bottom animate-blink" />
                    </pre>
                    <button className="bg-copper text-white border-none px-4 py-2 text-[12.5px] font-sans cursor-pointer">
                      Kirim tahap ini untuk diperiksa
                    </button>
                  </div>
                </div>
              )}

              {/* Inline editor for Transformatif */}
              {activeEditor === soal.id && soal.learningModel === "TRANSFORMATIF" && (
                <div className="mt-4 border border-line bg-white p-5">
                  <h4 className="text-[13.5px] font-semibold mb-1.5">{soal.title}</h4>
                  <p className="text-[12.5px] text-text-dim leading-relaxed mb-3.5">
                    Ceritakan satu aplikasi atau website yang sering kamu pakai sehari-hari.
                    Menurutmu, bagian mana dari tampilannya yang paling nyaman digunakan, dan
                    kenapa?
                  </p>
                  <textarea
                    className="w-full min-h-[110px] border border-line font-sans text-[13px] p-3 resize-y text-text-primary bg-paper"
                    placeholder="Tulis refleksimu di sini..."
                    defaultValue="Aplikasi yang sering saya pakai adalah aplikasi ojek online. Menurut saya bagian yang paling nyaman itu tombol pesan yang besar dan warnanya mencolok, jadi gampang ditemukan meski buru-buru..."
                  />
                  <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
                    <small className="text-text-dim text-[11.5px]">
                      Tidak ada skor otomatis — guru akan menilai dengan rubrik kualitatif.
                    </small>
                    <div className="flex gap-2 items-center">
                      <HandRaiseButton raised={handRaised} onToggle={() => setHandRaised(!handRaised)} />
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

              {/* Inline editor for Deep Learning */}
              {activeEditor === soal.id && soal.learningModel === "DEEP_LEARNING" && (
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
                  <div className="flex px-5 pt-4 pb-2 gap-0">
                    {[
                      { num: 1, label: "Memahami", done: true },
                      { num: 2, label: "Menganalisis", current: true },
                      { num: 3, label: "Mengevaluasi" },
                      { num: 4, label: "Mencipta" },
                    ].map((layer, i) => (
                      <div key={i} className="flex items-center gap-0">
                        <div className="text-center">
                          <div className={cn(
                            "w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center mx-auto mb-1.5 font-mono text-[12px]",
                            layer.done ? "bg-ocean border-ocean text-white" :
                            layer.current ? "bg-ocean border-ocean text-white" :
                            "bg-white border-line text-text-dim"
                          )}>
                            {layer.done ? "✓" : layer.num}
                          </div>
                          <small className="text-[10px] text-text-dim whitespace-nowrap">{layer.label}</small>
                        </div>
                        {i < 3 && (
                          <div className={cn("w-8 h-0.5 mt-[-12px] mx-1", layer.done ? "bg-ocean" : "bg-line")} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="px-5 pb-5">
                    <h4 className="text-[13.5px] font-semibold mb-1.5">Lapisan 2 dari 4 — Menganalisis</h4>
                    <p className="text-[12.5px] text-text-dim leading-relaxed mb-3">
                      Jelaskan perbedaan antara <code className="font-mono">justify-content</code> dan{" "}
                      <code className="font-mono">align-items</code>. Berikan contoh kasus di mana
                      masing-masing lebih tepat digunakan.
                    </p>
                    <textarea
                      className="w-full min-h-[100px] border border-line font-sans text-[13px] p-3 resize-y text-text-primary bg-paper mb-3"
                      placeholder="Tulis analisismu di sini..."
                      defaultValue="justify-content mengatur posisi elemen sepanjang sumbu utama (main axis), sedangkan align-items mengatur posisi di sumbu silang (cross axis)..."
                    />
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <small className="text-text-dim text-[11.5px]">
                        Dinilai per lapisan — skor lapisan lebih tinggi bernilai lebih besar.
                      </small>
                      <div className="flex gap-1.5 items-center">
                        <HandRaiseButton raised={handRaised} onToggle={() => setHandRaised(!handRaised)} />
                        <button className="bg-[var(--ocean)] text-white border-none px-4 py-2 text-[12.5px] font-sans cursor-pointer">
                          Kirim lapisan ini
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

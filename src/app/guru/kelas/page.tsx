"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KelasItem {
  id: string;
  name: string;
  joinCode: string;
  _count: { members: number; assignments: number };
}

interface MemberItem {
  id: string;
  user: { id: string; name: string; email: string };
  joinedAt: string;
}

interface PreviewStudent {
  name: string;
  email: string | null;
}

export default function KelolaKelasPage() {
  const [classes, setClasses] = useState<KelasItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const [activeKelas, setActiveKelas] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [importTarget, setImportTarget] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<PreviewStudent[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/kelas");
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  if (!loaded) {
    fetchClasses();
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setCreating(false);
        await fetchClasses();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleMembers(kelasId: string) {
    if (activeKelas === kelasId) {
      setActiveKelas(null);
      return;
    }
    setActiveKelas(kelasId);
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/kelas/${kelasId}/members`);
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoadingMembers(false);
    }
  }

  function startImport(kelasId: string) {
    setImportTarget(kelasId);
    setImportPreview(null);
    setImportResult(null);
    setImportError(null);
    fileRef.current?.click();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !importTarget) return;
    setImportFile(file);
    e.target.value = "";

    setUploadingPreview(true);
    setImportError(null);
    setImportResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("action", "preview");

      const res = await fetch(`/api/kelas/${importTarget}/import`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error);
        return;
      }
      setImportPreview(data.students);
    } catch {
      setImportError("Gagal membaca file");
    } finally {
      setUploadingPreview(false);
    }
  }

  async function handleConfirmImport() {
    if (!importTarget || !importFile) return;
    setImporting(true);
    setImportError(null);

    try {
      const form = new FormData();
      form.append("file", importFile);
      form.append("action", "confirm");

      const res = await fetch(`/api/kelas/${importTarget}/import`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error);
        return;
      }
      setImportResult(data);
      setImportPreview(null);
      await fetchClasses();
      if (activeKelas === importTarget) {
        const memRes = await fetch(`/api/kelas/${importTarget}/members`);
        if (memRes.ok) setMembers(await memRes.json());
      }
    } catch {
      setImportError("Gagal import siswa");
    } finally {
      setImporting(false);
    }
  }

  function cancelImport() {
    setImportTarget(null);
    setImportPreview(null);
    setImportResult(null);
    setImportError(null);
    setImportFile(null);
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold mb-1">Kelola kelas</h1>
          <p className="text-[13.5px] text-text-dim max-w-[520px]">
            Buat kelas baru dan kelola daftar siswa. Siswa bisa ditambahkan
            lewat import file Excel/PDF atau bergabung mandiri memakai kode
            kelas.
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>+ Buat kelas</Button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <Card className="p-5 mb-5 max-w-[480px]">
          <label className="block text-[13px] font-semibold mb-1.5">
            Nama kelas
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Contoh: X RPL 1, XI TKJ 2, XII PPLG 1"
            className="w-full border border-line bg-white px-3 py-2.5 text-[13.5px] font-sans mb-3 text-text-primary"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving ? "Menyimpan..." : "Simpan kelas"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
            >
              Batal
            </Button>
          </div>
        </Card>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Import preview modal */}
      {(importPreview || importError || importResult) && importTarget && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-[520px] w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-[16px] font-semibold mb-1">
              {importResult
                ? "Import selesai"
                : importError
                ? "Gagal import"
                : "Preview daftar siswa"}
            </h2>

            {importError && (
              <div className="bg-rust-soft border-l-[3px] border-rust px-4 py-3 mt-3 text-[13px]">
                {importError}
              </div>
            )}

            {importResult && (
              <div className="mt-3 text-[13.5px]">
                <div className="bg-pcb-soft border-l-[3px] border-pcb px-4 py-3 mb-3">
                  <strong>{importResult.imported}</strong> siswa berhasil
                  ditambahkan
                  {importResult.skipped > 0 && (
                    <>, <strong>{importResult.skipped}</strong> sudah terdaftar</>
                  )}
                </div>
              </div>
            )}

            {importPreview && (
              <>
                <p className="text-[13px] text-text-dim mt-2 mb-3">
                  {importPreview.length} siswa ditemukan dalam file. Periksa
                  dan konfirmasi untuk melanjutkan import.
                </p>
                <div className="border border-line max-h-[300px] overflow-y-auto mb-4">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-paper-dim">
                        <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider text-text-dim font-semibold">
                          No
                        </th>
                        <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider text-text-dim font-semibold">
                          Nama
                        </th>
                        <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider text-text-dim font-semibold">
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((s, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="px-3 py-2 text-text-dim">{i + 1}</td>
                          <td className="px-3 py-2">{s.name}</td>
                          <td className="px-3 py-2 text-text-dim text-[12px] font-mono">
                            {s.email || "auto-generate"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex gap-2 mt-4">
              {importPreview && !importResult && (
                <Button
                  onClick={() => handleConfirmImport()}
                  disabled={importing}
                >
                  {importing
                    ? "Mengimport..."
                    : `Import ${importPreview.length} siswa`}
                </Button>
              )}
              <Button variant="ghost" onClick={cancelImport}>
                {importResult ? "Tutup" : "Batal"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Class list */}
      {loaded && classes.length === 0 && !creating && (
        <Card className="p-8 text-center text-text-dim text-[13.5px]">
          Belum ada kelas. Buat kelas pertama untuk memulai.
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {classes.map((k) => (
          <Card key={k.id} className="p-0">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px]">{k.name}</div>
                <div className="text-[12.5px] text-text-dim mt-0.5 flex items-center gap-3">
                  <span>{k._count.members} siswa</span>
                  <span className="text-line">|</span>
                  <span>{k._count.assignments} soal</span>
                  <span className="text-line">|</span>
                  <span className="font-mono">
                    Kode: {k.joinCode}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="sm" onClick={() => startImport(k.id)}>
                  {uploadingPreview && importTarget === k.id
                    ? "Membaca..."
                    : "Import siswa"}
                </Button>
                <Button
                  variant="sm"
                  onClick={() => handleToggleMembers(k.id)}
                >
                  {activeKelas === k.id ? "Tutup" : "Lihat siswa"}
                </Button>
              </div>
            </div>

            {/* Members panel */}
            {activeKelas === k.id && (
              <div className="border-t border-line px-5 py-4 bg-paper-dim">
                {loadingMembers ? (
                  <div className="text-[13px] text-text-dim">Memuat...</div>
                ) : members.length === 0 ? (
                  <div className="text-[13px] text-text-dim">
                    Belum ada siswa di kelas ini. Import dari file atau
                    bagikan kode kelas{" "}
                    <span className="font-mono font-semibold text-text-primary">
                      {k.joinCode}
                    </span>{" "}
                    ke siswa.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {members.map((m, i) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2.5 py-1.5 text-[13px]"
                      >
                        <span className="text-text-dim font-mono text-[11px] w-5 text-right">
                          {i + 1}
                        </span>
                        <span>{m.user.name}</span>
                        <span className="text-[11px] text-text-dim font-mono truncate">
                          {m.user.email}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Help text */}
      {loaded && classes.length > 0 && (
        <div className="mt-6 text-[12.5px] text-text-dim leading-relaxed max-w-[560px]">
          <strong>Format file import:</strong> File Excel (.xlsx) harus punya
          kolom <span className="font-mono">Nama</span> (wajib) dan{" "}
          <span className="font-mono">Email</span> (opsional). File PDF
          akan dibaca otomatis dari daftar bernomor (1. Nama Siswa, 2. Nama
          Siswa, dst). Siswa yang belum punya akun akan dibuatkan otomatis
          dengan password default{" "}
          <span className="font-mono">siswa123</span>.
        </div>
      )}
    </div>
  );
}

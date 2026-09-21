import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGuru } from "@/lib/session";
import * as XLSX from "xlsx";

interface ParsedStudent {
  name: string;
  email: string | null;
}

function parseExcel(buffer: ArrayBuffer): ParsedStudent[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const students: ParsedStudent[] = [];
  for (const row of rows) {
    const name = findField(row, ["nama", "name", "nama siswa", "nama lengkap", "student name"]);
    if (!name) continue;
    const email = findField(row, ["email", "e-mail", "email siswa"]);
    students.push({ name: String(name).trim(), email: email ? String(email).trim() : null });
  }
  return students;
}

function findField(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase().trim();
    if (candidates.includes(lower)) return row[key];
  }
  return null;
}

async function parseDocx(buffer: ArrayBuffer): Promise<ParsedStudent[]> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  const lines = result.value
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  const students: ParsedStudent[] = [];
  const namePattern = /^\d+[.)]\s*(.+)/;
  const skipWords = ["no", "nama", "nis", "kelas", "daftar", "siswa", "halaman", "page"];

  for (const line of lines) {
    const match = namePattern.exec(line);
    if (match) {
      const name = match[1].replace(/\s{2,}/g, " ").trim();
      if (name.length >= 2 && name.length <= 100) {
        students.push({ name, email: null });
      }
      continue;
    }
    const lower = line.toLowerCase();
    if (skipWords.some((w) => lower.startsWith(w))) continue;
    if (/^[A-Z][a-z]/.test(line) && line.length >= 3 && line.length <= 100 && !/\d{4}/.test(line)) {
      students.push({ name: line, email: null });
    }
  }
  return students;
}

async function parsePdf(buffer: ArrayBuffer): Promise<ParsedStudent[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  await parser.destroy();
  const lines = result.text
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  const students: ParsedStudent[] = [];
  const namePattern = /^\d+[.)]\s*(.+)/;
  const skipWords = ["no", "nama", "nis", "kelas", "daftar", "siswa", "halaman", "page"];

  for (const line of lines) {
    const match = namePattern.exec(line);
    if (match) {
      const name = match[1].replace(/\s{2,}/g, " ").trim();
      if (name.length >= 2 && name.length <= 100) {
        students.push({ name, email: null });
      }
      continue;
    }
    const lower = line.toLowerCase();
    if (skipWords.some((w) => lower.startsWith(w))) continue;
    if (/^[A-Z][a-z]/.test(line) && line.length >= 3 && line.length <= 100 && !/\d{4}/.test(line)) {
      students.push({ name: line, email: null });
    }
  }
  return students;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    const session = await requireGuru();
    const { kelasId } = await params;

    const kelas = await prisma.kelas.findFirst({
      where: { id: kelasId, guruId: session.user.id },
    });
    if (!kelas) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const action = formData.get("action") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File wajib diunggah" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "pdf", "docx", "doc"].includes(ext || "")) {
      return NextResponse.json(
        { error: "Format file harus .xlsx, .xls, .docx, atau .pdf" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    let parsed: ParsedStudent[];

    if (ext === "pdf") {
      parsed = await parsePdf(buffer);
    } else if (ext === "docx" || ext === "doc") {
      parsed = await parseDocx(buffer);
    } else {
      parsed = parseExcel(buffer);
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data siswa yang berhasil dibaca dari file" },
        { status: 422 }
      );
    }

    if (action === "preview") {
      return NextResponse.json({ students: parsed, count: parsed.length });
    }

    const defaultPassword = await import("bcryptjs").then((m) =>
      m.hash("siswa123", 12)
    );

    let imported = 0;
    let skipped = 0;

    for (const s of parsed) {
      const email =
        s.email || `${s.name.toLowerCase().replace(/\s+/g, ".")}@siswa.bengkelkode.id`;

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: s.name,
            email,
            passwordHash: defaultPassword,
            role: "SISWA",
          },
        });
      }

      const existing = await prisma.kelasMember.findUnique({
        where: { kelasId_userId: { kelasId, userId: user.id } },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.kelasMember.create({
        data: { kelasId, userId: user.id },
      });
      imported++;
    }

    return NextResponse.json({ imported, skipped, total: parsed.length });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan saat import" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireSiswa } from "@/lib/session";
import { initializeMilestones } from "@/engines/pbl";
import { initializeLayers } from "@/engines/deep-learning";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const soalId = searchParams.get("soalId");
    const kelasId = searchParams.get("kelasId");

    const where: Record<string, unknown> = {};

    if (session.user.role === "SISWA") {
      where.studentId = session.user.id;
    }
    if (soalId) where.soalId = soalId;
    if (kelasId) {
      where.soal = { assignments: { some: { kelasId } } };
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        soal: { select: { title: true, learningModel: true, topic: true } },
        student: { select: { id: true, name: true } },
        milestoneProgress: {
          include: { milestone: true },
          orderBy: { milestone: { order: "asc" } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(submissions);
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSiswa();
    const { soalId } = await req.json();

    const existing = await prisma.submission.findUnique({
      where: {
        soalId_studentId: { soalId, studentId: session.user.id },
      },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const soal = await prisma.soal.findUniqueOrThrow({
      where: { id: soalId },
    });

    const submission = await prisma.submission.create({
      data: {
        soalId,
        studentId: session.user.id,
        code: soal.starterCode,
      },
    });

    if (soal.learningModel === "PBL") {
      await initializeMilestones(submission.id, soalId);
    }

    if (soal.learningModel === "DEEP_LEARNING") {
      await initializeLayers(submission.id, soalId);
    }

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

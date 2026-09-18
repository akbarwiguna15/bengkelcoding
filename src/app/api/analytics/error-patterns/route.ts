import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGuru } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireGuru();

    const { searchParams } = new URL(req.url);
    const kelasId = searchParams.get("kelasId");
    const soalId = searchParams.get("soalId");

    if (!kelasId) {
      return NextResponse.json({ error: "kelasId wajib diisi" }, { status: 400 });
    }

    const members = await prisma.kelasMember.findMany({
      where: { kelasId },
      select: { userId: true },
    });
    const studentIds = members.map((m) => m.userId);
    const totalStudents = studentIds.length;

    const where: Record<string, unknown> = {
      submission: { studentId: { in: studentIds } },
    };
    if (soalId) {
      where.submission = { ...where.submission as object, soalId };
    }

    const errors = await prisma.errorLog.groupBy({
      by: ["conceptTagId"],
      where,
      _count: { id: true },
    });

    const tagIds = errors.map((e) => e.conceptTagId);
    const tags = await prisma.conceptTag.findMany({
      where: { id: { in: tagIds } },
    });
    const tagMap = new Map(tags.map((t) => [t.id, t.name]));

    const studentsPerTag = await Promise.all(
      errors.map(async (e) => {
        const distinctStudents = await prisma.errorLog.findMany({
          where: {
            conceptTagId: e.conceptTagId,
            submission: { studentId: { in: studentIds } },
          },
          select: { submission: { select: { studentId: true } } },
          distinct: ["submissionId"],
        });
        return {
          conceptTagId: e.conceptTagId,
          uniqueStudents: new Set(
            distinctStudents.map((d) => d.submission.studentId)
          ).size,
        };
      })
    );

    const patterns = errors
      .map((e) => {
        const studentCount =
          studentsPerTag.find((s) => s.conceptTagId === e.conceptTagId)
            ?.uniqueStudents || 0;
        return {
          conceptTagId: e.conceptTagId,
          conceptTagName: tagMap.get(e.conceptTagId) || "unknown",
          count: studentCount,
          total: totalStudents,
          percentage: Math.round((studentCount / totalStudents) * 100),
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    return NextResponse.json(patterns);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

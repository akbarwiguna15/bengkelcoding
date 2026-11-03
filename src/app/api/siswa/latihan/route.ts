import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SISWA") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.id;

  const memberships = await prisma.kelasMember.findMany({
    where: { userId: studentId },
    include: {
      kelas: {
        select: {
          id: true,
          name: true,
          assignments: {
            include: {
              soal: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  learningModel: true,
                  difficulty: true,
                  starterCode: true,
                  language: true,
                  regime: true,
                  testCases: {
                    where: { isHidden: false },
                    select: { id: true, label: true, order: true },
                    orderBy: { order: "asc" },
                  },
                  milestones: {
                    select: { id: true, title: true, description: true, order: true },
                    orderBy: { order: "asc" },
                  },
                  rubricCriteria: {
                    select: { id: true, name: true, description: true, maxScore: true, order: true },
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (memberships.length === 0) {
    return NextResponse.json({ kelasList: [] });
  }

  const soalIds = memberships.flatMap((m) =>
    m.kelas.assignments.map((a) => a.soal.id)
  );

  const submissions =
    soalIds.length > 0
      ? await prisma.submission.findMany({
          where: { studentId, soalId: { in: soalIds } },
          select: {
            soalId: true,
            status: true,
            autoGradeScore: true,
            totalScore: true,
            milestoneProgress: {
              select: { milestoneId: true, status: true },
            },
            rubricGrades: {
              select: { criterionId: true, score: true },
            },
          },
        })
      : [];

  const subMap = new Map(submissions.map((s) => [s.soalId, s]));

  const diffLabel = (d: number) =>
    d <= 1 ? "Mudah" : d === 2 ? "Menengah" : "Sulit";

  const kelasList = memberships.map((m) => ({
    kelasId: m.kelas.id,
    kelasName: m.kelas.name,
    soalList: m.kelas.assignments.map((a) => {
      const soal = a.soal;
      const sub = subMap.get(soal.id);

      let status: "available" | "done" | "in_progress" = "available";
      let score: number | null = null;
      if (sub) {
        if (sub.status === "GRADED" || sub.status === "SUBMITTED") {
          status = "done";
          score = sub.totalScore ?? sub.autoGradeScore ?? null;
        } else {
          status = "in_progress";
        }
      }

      return {
        id: soal.id,
        title: soal.title,
        description: soal.description,
        learningModel: soal.learningModel,
        difficulty: diffLabel(soal.difficulty),
        starterCode: soal.starterCode,
        language: soal.language,
        regime: soal.regime,
        testCases: soal.testCases,
        milestones: soal.milestones,
        rubricCriteria: soal.rubricCriteria,
        status,
        score,
        milestoneProgress: sub?.milestoneProgress ?? [],
        rubricGrades: sub?.rubricGrades ?? [],
        dueAt: a.dueAt?.toISOString() ?? null,
      };
    }),
  }));

  return NextResponse.json({ kelasList });
}

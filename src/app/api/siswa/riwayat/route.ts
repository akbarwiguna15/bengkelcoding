import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "SISWA") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.id;

  const submissions = await prisma.submission.findMany({
    where: { studentId, status: { in: ["SUBMITTED", "GRADED"] } },
    include: {
      soal: {
        select: {
          id: true,
          title: true,
          learningModel: true,
          testCases: {
            where: { isHidden: false },
            select: { id: true, label: true, order: true, expected: true },
            orderBy: { order: "asc" },
          },
          milestones: {
            select: { id: true, title: true, order: true },
            orderBy: { order: "asc" },
          },
          rubricCriteria: {
            select: { id: true, name: true, description: true, maxScore: true, order: true },
            orderBy: { order: "asc" },
          },
        },
      },
      milestoneProgress: {
        include: { milestone: { select: { id: true, title: true, order: true } } },
        orderBy: { milestone: { order: "asc" } },
      },
      rubricGrades: {
        include: { criterion: { select: { id: true, name: true, maxScore: true } } },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const result = submissions.map((sub) => ({
    id: sub.id,
    soalId: sub.soal.id,
    soalTitle: sub.soal.title,
    learningModel: sub.soal.learningModel,
    status: sub.status,
    autoGradeScore: sub.autoGradeScore,
    totalScore: sub.totalScore,
    testsPassed: sub.testsPassed,
    testsTotal: sub.testsTotal,
    teacherComment: sub.teacherComment,
    submittedAt: sub.submittedAt?.toISOString() ?? null,
    gradedAt: sub.gradedAt?.toISOString() ?? null,
    testCases: sub.soal.testCases,
    testResultsJson: sub.testResultsJson as
      | { testCaseId: string; label: string; passed: boolean; actual: string; expected: string }[]
      | null,
    milestones: sub.soal.milestones,
    milestoneProgress: sub.milestoneProgress.map((mp) => ({
      milestoneId: mp.milestoneId,
      title: mp.milestone.title,
      order: mp.milestone.order,
      status: mp.status,
      teacherNote: mp.teacherNote,
    })),
    rubricCriteria: sub.soal.rubricCriteria,
    rubricGrades: sub.rubricGrades.map((rg) => ({
      criterionId: rg.criterionId,
      name: rg.criterion.name,
      maxScore: rg.criterion.maxScore,
      score: rg.score,
      feedback: rg.feedback,
    })),
  }));

  return NextResponse.json(result);
}

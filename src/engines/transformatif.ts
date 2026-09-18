import { prisma } from "@/lib/prisma";

interface RubricGradeInput {
  criterionId: string;
  score: number;
  feedback?: string;
}

export async function gradeSubmission(
  submissionId: string,
  grades: RubricGradeInput[],
  teacherComment?: string
): Promise<{ totalScore: number }> {
  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: submissionId },
    include: { soal: { include: { rubricCriteria: true } } },
  });

  const criteria = submission.soal.rubricCriteria;
  const criteriaMap = new Map(criteria.map((c) => [c.id, c]));

  for (const grade of grades) {
    const criterion = criteriaMap.get(grade.criterionId);
    if (!criterion) throw new Error(`Kriteria ${grade.criterionId} tidak ditemukan`);
    if (grade.score < 0 || grade.score > criterion.maxScore) {
      throw new Error(`Skor untuk "${criterion.name}" harus 0-${criterion.maxScore}`);
    }
  }

  for (const grade of grades) {
    await prisma.rubricGrade.upsert({
      where: {
        criterionId_submissionId: {
          criterionId: grade.criterionId,
          submissionId,
        },
      },
      create: {
        criterionId: grade.criterionId,
        submissionId,
        score: grade.score,
        feedback: grade.feedback,
      },
      update: {
        score: grade.score,
        feedback: grade.feedback,
      },
    });
  }

  const sumScore = grades.reduce((acc, g) => acc + g.score, 0);
  const sumMax = criteria.reduce((acc, c) => acc + c.maxScore, 0);
  const totalScore = sumMax > 0 ? Math.round((sumScore / sumMax) * 100) : 0;

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      totalScore,
      teacherComment,
      status: "GRADED",
      gradedAt: new Date(),
    },
  });

  return { totalScore };
}

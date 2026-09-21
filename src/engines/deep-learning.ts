import { prisma } from "@/lib/prisma";

const LAYER_WEIGHTS: Record<number, number> = {
  1: 20,  // Memahami
  2: 25,  // Menganalisis
  3: 25,  // Mengevaluasi
  4: 30,  // Mencipta
};

export async function initializeLayers(
  submissionId: string,
  soalId: string
): Promise<void> {
  const milestones = await prisma.milestone.findMany({
    where: { soalId },
    orderBy: { order: "asc" },
  });

  for (let i = 0; i < milestones.length; i++) {
    await prisma.milestoneProgress.create({
      data: {
        milestoneId: milestones[i].id,
        submissionId,
        status: i === 0 ? "IN_PROGRESS" : "LOCKED",
      },
    });
  }
}

export async function submitLayer(
  submissionId: string,
  milestoneId: string,
  content: string
): Promise<void> {
  const progress = await prisma.milestoneProgress.findUnique({
    where: {
      milestoneId_submissionId: { milestoneId, submissionId },
    },
  });

  if (!progress || progress.status !== "IN_PROGRESS") {
    throw new Error("Lapisan ini belum bisa dikerjakan");
  }

  await prisma.milestoneProgress.update({
    where: { id: progress.id },
    data: { content, status: "PENDING_REVIEW" },
  });
}

export async function gradeLayer(
  milestoneId: string,
  submissionId: string,
  score: number,
  teacherNote?: string
): Promise<void> {
  const progress = await prisma.milestoneProgress.findUniqueOrThrow({
    where: {
      milestoneId_submissionId: { milestoneId, submissionId },
    },
    include: { milestone: true },
  });

  const maxScore = LAYER_WEIGHTS[progress.milestone.order] ?? 25;
  if (score < 0 || score > maxScore) {
    throw new Error(`Skor lapisan ${progress.milestone.order} harus 0-${maxScore}`);
  }

  await prisma.milestoneProgress.update({
    where: { id: progress.id },
    data: { status: "APPROVED", teacherNote: `${score}/${maxScore}${teacherNote ? ` — ${teacherNote}` : ""}` },
  });

  const nextMilestone = await prisma.milestone.findFirst({
    where: {
      soalId: progress.milestone.soalId,
      order: progress.milestone.order + 1,
    },
  });

  if (nextMilestone) {
    await prisma.milestoneProgress.updateMany({
      where: {
        milestoneId: nextMilestone.id,
        submissionId,
        status: "LOCKED",
      },
      data: { status: "IN_PROGRESS" },
    });
  } else {
    const totalScore = await calculateLayerScore(submissionId);
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        totalScore,
        status: "GRADED",
        gradedAt: new Date(),
      },
    });
  }
}

export async function calculateLayerScore(submissionId: string): Promise<number> {
  const progress = await prisma.milestoneProgress.findMany({
    where: { submissionId },
    include: { milestone: true },
    orderBy: { milestone: { order: "asc" } },
  });

  let earned = 0;
  for (const p of progress) {
    if (p.status === "APPROVED" && p.teacherNote) {
      const match = p.teacherNote.match(/^(\d+)\//);
      if (match) earned += parseInt(match[1], 10);
    }
  }

  return earned;
}

export async function getLayerProgress(submissionId: string) {
  const progress = await prisma.milestoneProgress.findMany({
    where: { submissionId },
    include: { milestone: true },
    orderBy: { milestone: { order: "asc" } },
  });

  const totalMax = Object.values(LAYER_WEIGHTS).reduce((a, b) => a + b, 0);

  return progress.map((p) => {
    const maxScore = LAYER_WEIGHTS[p.milestone.order] ?? 25;
    let score: number | null = null;

    if (p.status === "APPROVED" && p.teacherNote) {
      const match = p.teacherNote.match(/^(\d+)\//);
      if (match) score = parseInt(match[1], 10);
    }

    return {
      layerNum: p.milestone.order,
      label: p.milestone.title,
      description: p.milestone.description,
      maxScore,
      score,
      status: p.status,
      content: p.content,
    };
  });
}

export { LAYER_WEIGHTS, LAYER_WEIGHTS as layerWeights };

import { prisma } from "@/lib/prisma";

export async function initializeMilestones(
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

export async function submitMilestone(
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
    throw new Error("Milestone ini belum bisa dikerjakan");
  }

  await prisma.milestoneProgress.update({
    where: { id: progress.id },
    data: { content, status: "PENDING_REVIEW" },
  });
}

export async function reviewMilestone(
  milestoneId: string,
  submissionId: string,
  decision: "APPROVED" | "REVISION_NEEDED",
  teacherNote?: string
): Promise<void> {
  const progress = await prisma.milestoneProgress.findUniqueOrThrow({
    where: {
      milestoneId_submissionId: { milestoneId, submissionId },
    },
    include: { milestone: true },
  });

  await prisma.milestoneProgress.update({
    where: { id: progress.id },
    data: { status: decision, teacherNote },
  });

  if (decision === "APPROVED") {
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
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: "GRADED",
          gradedAt: new Date(),
        },
      });
    }
  }
}

export async function calculateProgress(submissionId: string): Promise<number> {
  const milestones = await prisma.milestoneProgress.findMany({
    where: { submissionId },
  });

  if (milestones.length === 0) return 0;

  const approved = milestones.filter((m) => m.status === "APPROVED").length;
  return Math.round((approved / milestones.length) * 100);
}

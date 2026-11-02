import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "GURU") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { kelasId } = await params;

  const kelas = await prisma.kelas.findFirst({
    where: { id: kelasId, guruId: session.user.id },
    select: { id: true, name: true },
  });
  if (!kelas) {
    return NextResponse.json(
      { error: "Kelas tidak ditemukan" },
      { status: 404 }
    );
  }

  const assignments = await prisma.soalAssignment.findMany({
    where: { kelasId },
    include: {
      soal: {
        select: {
          id: true,
          title: true,
          learningModel: true,
          difficulty: true,
          estimatedMinutes: true,
          milestones: {
            select: { id: true, title: true, order: true },
            orderBy: { order: "asc" },
          },
          rubricCriteria: {
            select: { id: true, name: true, maxScore: true, order: true },
            orderBy: { order: "asc" },
          },
          _count: { select: { testCases: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const soalList = assignments.map((a) => ({
    soalId: a.soal.id,
    title: a.soal.title,
    learningModel: a.soal.learningModel,
    difficulty: a.soal.difficulty,
    estimatedMinutes: a.soal.estimatedMinutes,
    dueAt: a.dueAt?.toISOString() ?? null,
    testCaseCount: a.soal._count.testCases,
    milestones: a.soal.milestones,
    rubricCriteria: a.soal.rubricCriteria,
  }));

  const soalIds = soalList.map((s) => s.soalId);

  const members = await prisma.kelasMember.findMany({
    where: { kelasId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const studentIds = members.map((m) => m.user.id);

  if (studentIds.length === 0 || soalIds.length === 0) {
    return NextResponse.json({
      kelas,
      soalList,
      students: [],
      errorPatterns: [],
    });
  }

  const submissions = await prisma.submission.findMany({
    where: { studentId: { in: studentIds }, soalId: { in: soalIds } },
    select: {
      soalId: true,
      studentId: true,
      status: true,
      testsPassed: true,
      testsTotal: true,
      autoGradeScore: true,
      totalScore: true,
      createdAt: true,
      milestoneProgress: { select: { milestoneId: true, status: true } },
      rubricGrades: { select: { criterionId: true, score: true } },
    },
  });

  const subMap = new Map<string, (typeof submissions)[number]>();
  for (const s of submissions) subMap.set(`${s.studentId}:${s.soalId}`, s);

  const handEvents = await prisma.studentEvent.findMany({
    where: {
      studentId: { in: studentIds },
      classId: kelasId,
      type: { in: ["hand_raise", "hand_lower"] },
    },
    orderBy: { clientTs: "desc" },
    select: { studentId: true, taskId: true, type: true },
  });

  const handRaisedSet = new Set<string>();
  const handSeen = new Set<string>();
  for (const e of handEvents) {
    const key = `${e.studentId}:${e.taskId}`;
    if (!handSeen.has(key)) {
      handSeen.add(key);
      if (e.type === "hand_raise") handRaisedSet.add(e.studentId);
    }
  }

  const hintGroups = await prisma.hint.groupBy({
    by: ["receiverId"],
    where: { receiverId: { in: studentIds }, soalId: { in: soalIds } },
    _count: { id: true },
  });
  const hintMap = new Map(hintGroups.map((h) => [h.receiverId, h._count.id]));

  const activities = await prisma.studentActivity.findMany({
    where: { userId: { in: studentIds }, kelasId },
    select: {
      userId: true,
      soalId: true,
      status: true,
      stuckSince: true,
      lastEventAt: true,
    },
    orderBy: { lastEventAt: "desc" },
  });
  const actMap = new Map<string, (typeof activities)[number]>();
  for (const a of activities) {
    if (!actMap.has(a.userId)) actMap.set(a.userId, a);
  }

  const errorGroups = await prisma.studentEvent.groupBy({
    by: ["studentId", "taskId"],
    where: {
      studentId: { in: studentIds },
      classId: kelasId,
      type: "console_error",
    },
    _count: { id: true },
  });
  const errorMap = new Map<string, number>();
  for (const e of errorGroups)
    errorMap.set(`${e.studentId}:${e.taskId}`, e._count.id);

  const submitGroups = await prisma.studentEvent.groupBy({
    by: ["studentId", "taskId"],
    where: {
      studentId: { in: studentIds },
      classId: kelasId,
      type: "submit_result",
    },
    _count: { id: true },
  });
  const submitMap = new Map<string, number>();
  for (const e of submitGroups)
    submitMap.set(`${e.studentId}:${e.taskId}`, e._count.id);

  const errorLogs = await prisma.errorLog.findMany({
    where: {
      submission: { soalId: { in: soalIds }, studentId: { in: studentIds } },
    },
    select: {
      conceptTagId: true,
      submission: { select: { studentId: true, soalId: true } },
    },
  });

  const patternMap = new Map<
    string,
    { soalIds: Set<string>; studentIds: Set<string>; count: number }
  >();
  for (const log of errorLogs) {
    const existing = patternMap.get(log.conceptTagId) ?? {
      soalIds: new Set(),
      studentIds: new Set(),
      count: 0,
    };
    existing.soalIds.add(log.submission.soalId);
    existing.studentIds.add(log.submission.studentId);
    existing.count++;
    patternMap.set(log.conceptTagId, existing);
  }

  const conceptTagIds = [...patternMap.keys()];
  const conceptTags =
    conceptTagIds.length > 0
      ? await prisma.conceptTag.findMany({
          where: { id: { in: conceptTagIds } },
          select: { id: true, name: true },
        })
      : [];
  const tagNameMap = new Map(conceptTags.map((t) => [t.id, t.name]));
  const soalTitleMap = new Map(soalList.map((s) => [s.soalId, s.title]));

  const errorPatterns = [...patternMap.entries()]
    .map(([tagId, data]) => ({
      conceptTagName: tagNameMap.get(tagId) ?? "Unknown",
      soalTitle: [...data.soalIds]
        .map((id) => soalTitleMap.get(id) ?? id)
        .join(", "),
      studentCount: data.studentIds.size,
      totalStudents: studentIds.length,
      pct: Math.round((data.studentIds.size / studentIds.length) * 100),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  const students = members.map((m) => {
    const sid = m.user.id;
    const activity = actMap.get(sid);

    return {
      id: sid,
      name: m.user.name,
      submissions: soalIds.map((soalId) => {
        const sub = subMap.get(`${sid}:${soalId}`);
        if (!sub)
          return {
            soalId,
            status: null as string | null,
            testsPassed: null as number | null,
            testsTotal: null as number | null,
            autoGradeScore: null as number | null,
            totalScore: null as number | null,
            createdAt: null as string | null,
            milestoneProgress: [] as { milestoneId: string; status: string }[],
            rubricGrades: [] as { criterionId: string; score: number }[],
          };
        return {
          soalId,
          status: sub.status as string,
          testsPassed: sub.testsPassed,
          testsTotal: sub.testsTotal,
          autoGradeScore: sub.autoGradeScore,
          totalScore: sub.totalScore,
          createdAt: sub.createdAt.toISOString(),
          milestoneProgress: sub.milestoneProgress.map((mp) => ({
            milestoneId: mp.milestoneId,
            status: mp.status,
          })),
          rubricGrades: sub.rubricGrades.map((rg) => ({
            criterionId: rg.criterionId,
            score: rg.score,
          })),
        };
      }),
      handRaised: handRaisedSet.has(sid),
      hintCount: hintMap.get(sid) ?? 0,
      activeSoalId: activity?.soalId ?? null,
      activityStatus: activity?.status ?? null,
      stuckSince: activity?.stuckSince?.toISOString() ?? null,
      lastEventAt: activity?.lastEventAt?.toISOString() ?? null,
      errorCounts: Object.fromEntries(
        soalIds
          .filter((soalId) => errorMap.has(`${sid}:${soalId}`))
          .map((soalId) => [soalId, errorMap.get(`${sid}:${soalId}`)!])
      ),
      submitCounts: Object.fromEntries(
        soalIds
          .filter((soalId) => submitMap.has(`${sid}:${soalId}`))
          .map((soalId) => [soalId, submitMap.get(`${sid}:${soalId}`)!])
      ),
    };
  });

  return NextResponse.json({ kelas, soalList, students, errorPatterns });
}

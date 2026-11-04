import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGuru } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireGuru();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    if (!classId) {
      return NextResponse.json(
        { error: "classId required" },
        { status: 400 }
      );
    }

    const flags = await prisma.$queryRaw<
      { student_id: string; task_id: string; value: string }[]
    >`
      SELECT DISTINCT ON (student_id, task_id)
        student_id, task_id, payload->>'value' as value
      FROM student_events
      WHERE type = 'teacher_flag' AND class_id = ${classId}
      ORDER BY student_id, task_id, client_ts DESC
    `;

    const stuck = flags
      .filter((f) => f.value === "stuck")
      .map((f) => `${f.student_id}::${f.task_id}`);

    return NextResponse.json({ stuck });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireGuru();
    const { studentId, soalId, classId, value } = await req.json();

    if (!studentId || !soalId || !classId) {
      return NextResponse.json(
        { error: "studentId, soalId, classId required" },
        { status: 400 }
      );
    }
    if (value !== "stuck" && value !== "ok") {
      return NextResponse.json(
        { error: "value must be 'stuck' or 'ok'" },
        { status: 400 }
      );
    }

    const event = await prisma.studentEvent.create({
      data: {
        studentId,
        classId,
        taskId: soalId,
        attemptId: `flag_${Date.now().toString(36)}`,
        type: "teacher_flag",
        payload: { value },
        clientTs: new Date(),
        seq: 0,
      },
    });

    return NextResponse.json({ id: event.id, value });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

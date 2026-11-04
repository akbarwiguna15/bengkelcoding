import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGuru } from "@/lib/session";

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

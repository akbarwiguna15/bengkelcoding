import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { StudentEventRecord } from "@/types/events";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { events }: { events: StudentEventRecord[] } = await req.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "events array required" },
        { status: 400 }
      );
    }

    if (events.length > 100) {
      return NextResponse.json(
        { error: "max 100 events per batch" },
        { status: 400 }
      );
    }

    const data = events.map((e) => ({
      studentId: session.user.id,
      classId: e.classId,
      taskId: e.taskId,
      attemptId: e.attemptId,
      type: e.type,
      payload: e.payload as object,
      clientTs: new Date(e.clientTs),
      seq: e.seq,
    }));

    const result = await prisma.studentEvent.createMany({
      data,
      skipDuplicates: true,
    });

    return NextResponse.json({ inserted: result.count });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

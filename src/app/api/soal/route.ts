import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireGuru } from "@/lib/session";
import { createSoalSchema } from "@/lib/validators";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const learningModel = searchParams.get("learningModel");
    const status = searchParams.get("status");
    const kelasId = searchParams.get("kelasId");

    const where: Record<string, unknown> = {};

    if (session.user.role === "GURU") {
      where.createdById = session.user.id;
    } else if (kelasId) {
      where.assignments = { some: { kelasId } };
      where.status = "APPROVED";
    }

    if (learningModel) where.learningModel = learningModel;
    if (status && session.user.role === "GURU") where.status = status;

    const soal = await prisma.soal.findMany({
      where,
      include: {
        _count: { select: { testCases: true, milestones: true, submissions: true } },
        conceptTags: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(soal);
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireGuru();
    const body = await req.json();
    const data = createSoalSchema.parse(body);

    const soal = await prisma.soal.create({
      data: {
        ...data,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(soal, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

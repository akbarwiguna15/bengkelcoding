import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireGuru } from "@/lib/session";
import { createKelasSchema } from "@/lib/validators";
import { generateJoinCode } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "GURU") {
      const classes = await prisma.kelas.findMany({
        where: { guruId: session.user.id },
        include: { _count: { select: { members: true, assignments: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(classes);
    }

    const memberships = await prisma.kelasMember.findMany({
      where: { userId: session.user.id },
      include: {
        kelas: {
          include: {
            guru: { select: { name: true } },
            _count: { select: { members: true, assignments: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return NextResponse.json(memberships.map((m) => m.kelas));
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireGuru();
    const body = await req.json();
    const data = createKelasSchema.parse(body);

    let joinCode = generateJoinCode();
    let attempts = 0;
    while (
      (await prisma.kelas.findUnique({ where: { joinCode } })) &&
      attempts < 10
    ) {
      joinCode = generateJoinCode();
      attempts++;
    }

    const kelas = await prisma.kelas.create({
      data: {
        name: data.name,
        joinCode,
        guruId: session.user.id,
      },
    });

    return NextResponse.json(kelas, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden: hanya guru") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

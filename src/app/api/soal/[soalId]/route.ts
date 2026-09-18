import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireGuru } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ soalId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { soalId } = await params;

    const soal = await prisma.soal.findUniqueOrThrow({
      where: { id: soalId },
      include: {
        testCases: { orderBy: { order: "asc" } },
        milestones: { orderBy: { order: "asc" } },
        rubricCriteria: { orderBy: { order: "asc" } },
        conceptTags: true,
        createdBy: { select: { name: true } },
      },
    });

    return NextResponse.json(soal);
  } catch {
    return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ soalId: string }> }
) {
  try {
    await requireGuru();
    const { soalId } = await params;
    const body = await req.json();

    const soal = await prisma.soal.update({
      where: { id: soalId },
      data: body,
    });

    return NextResponse.json(soal);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

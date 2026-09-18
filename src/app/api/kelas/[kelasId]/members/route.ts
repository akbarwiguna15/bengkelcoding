import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { joinKelasSchema } from "@/lib/validators";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kelasId } = await params;

    const members = await prisma.kelasMember.findMany({
      where: { kelasId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json(members);
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "SISWA") {
      return NextResponse.json({ error: "Hanya siswa yang bisa bergabung" }, { status: 403 });
    }

    const body = await req.json();
    const data = joinKelasSchema.parse(body);

    const kelas = await prisma.kelas.findUnique({
      where: { joinCode: data.joinCode },
    });

    if (!kelas) {
      return NextResponse.json({ error: "Kode kelas tidak ditemukan" }, { status: 404 });
    }

    const existing = await prisma.kelasMember.findUnique({
      where: {
        kelasId_userId: { kelasId: kelas.id, userId: session.user.id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Sudah bergabung di kelas ini" }, { status: 409 });
    }

    await prisma.kelasMember.create({
      data: { kelasId: kelas.id, userId: session.user.id },
    });

    return NextResponse.json({ kelasId: kelas.id, name: kelas.name }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

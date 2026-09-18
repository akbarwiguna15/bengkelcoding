import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireGuru } from "@/lib/session";
import { sendHintSchema } from "@/lib/validators";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const soalId = searchParams.get("soalId");

    const where: Record<string, unknown> = {};

    if (session.user.role === "SISWA") {
      where.receiverId = session.user.id;
      where.readAt = null;
    } else {
      where.senderId = session.user.id;
    }

    if (soalId) where.soalId = soalId;

    const hints = await prisma.hint.findMany({
      where,
      include: {
        sender: { select: { name: true } },
        receiver: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(hints);
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireGuru();
    const body = await req.json();
    const data = sendHintSchema.parse(body);

    const hint = await prisma.hint.create({
      data: {
        senderId: session.user.id,
        receiverId: data.receiverId,
        soalId: data.soalId,
        message: data.message,
      },
      include: {
        sender: { select: { name: true } },
      },
    });

    return NextResponse.json(hint, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

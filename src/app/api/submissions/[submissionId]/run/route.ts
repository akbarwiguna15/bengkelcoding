import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSiswa } from "@/lib/session";
import { evaluateSubmission } from "@/engines/problem-solving";
import { submitLayer } from "@/engines/deep-learning";
import { submitCodeSchema } from "@/lib/validators";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    await requireSiswa();
    const { submissionId } = await params;
    const body = await req.json();

    const submission = await prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { soal: { select: { learningModel: true } } },
    });

    if (submission.soal.learningModel === "DEEP_LEARNING") {
      const { milestoneId, content } = body as { milestoneId: string; content: string };
      await submitLayer(submissionId, milestoneId, content);
      return NextResponse.json({ ok: true });
    }

    const data = submitCodeSchema.parse(body);
    const result = await evaluateSubmission(submissionId, data.code);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

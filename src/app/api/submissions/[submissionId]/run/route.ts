import { NextResponse } from "next/server";
import { requireSiswa } from "@/lib/session";
import { evaluateSubmission } from "@/engines/problem-solving";
import { submitCodeSchema } from "@/lib/validators";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    await requireSiswa();
    const { submissionId } = await params;
    const body = await req.json();
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

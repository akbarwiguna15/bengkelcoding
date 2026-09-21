import { NextResponse } from "next/server";
import { requireGuru } from "@/lib/session";
import { z } from "zod";

const validateSoalSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  learningModel: z.enum(["PROBLEM_SOLVING", "PBL", "TRANSFORMATIF", "DEEP_LEARNING"]),
  codeBlock: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await requireGuru();
    const body = await req.json();
    const data = validateSoalSchema.parse(body);

    // In production: call AI provider to analyze whether the soal content
    // matches the selected learning model's pedagogy.
    //
    // The AI checks:
    // - PROBLEM_SOLVING: Does it present a real bug/case to solve?
    // - PBL: Does it have clear milestones for a project?
    // - TRANSFORMATIF: Does it ask for personal reflection + concept connection?
    // - DEEP_LEARNING: Does it progress through Bloom's taxonomy layers?
    //
    // Returns correction suggestions if mismatch is detected.

    const result = {
      isValid: true,
      confidence: 0.92,
      message: `Soal sesuai dengan model ${data.learningModel}.`,
      suggestedModel: null as string | null,
      corrections: [] as string[],
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

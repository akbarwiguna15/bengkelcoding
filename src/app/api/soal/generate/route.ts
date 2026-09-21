import { NextResponse } from "next/server";
import { requireGuru } from "@/lib/session";
import { generateSoalSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    await requireGuru();
    const body = await req.json();
    const data = generateSoalSchema.parse(body);

    // In production: call AI provider (e.g. Claude API) with a prompt
    // that includes the learning model, topic, difficulty, and context.
    // The AI generates soal drafts tailored to the model's pedagogy.
    //
    // Example prompt structure:
    // - PROBLEM_SOLVING: "Generate a coding problem with a bug to fix..."
    // - PBL: "Generate a multi-milestone project..."
    // - TRANSFORMATIF: "Generate a reflective question linking code to life..."
    // - DEEP_LEARNING: "Generate a 4-layer Bloom's analysis task..."

    const drafts = Array.from({ length: data.count }, (_, i) => ({
      id: `draft-${Date.now()}-${i}`,
      title: `Draft soal ${data.topic} #${i + 1}`,
      description: `Soal ${data.learningModel} untuk topik ${data.topic}`,
      learningModel: data.learningModel,
      topic: data.topic,
      difficulty: data.difficulty,
      starterCode: null,
      rubrik: `Rubrik otomatis untuk model ${data.learningModel}`,
      generatedByAI: true,
    }));

    return NextResponse.json({ drafts });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

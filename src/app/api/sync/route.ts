import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { SyncMutation, SyncResult } from "@/types";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mutations }: { mutations: SyncMutation[] } = await req.json();
    const results: SyncResult[] = [];

    const sorted = [...mutations].sort(
      (a, b) => new Date(a.clientTs).getTime() - new Date(b.clientTs).getTime()
    );

    for (const mutation of sorted) {
      try {
        await prisma.syncLog.create({
          data: {
            userId: session.user.id,
            entityType: extractEntityType(mutation.url),
            entityId: mutation.id,
            action: mutation.method === "POST" ? "create" : "update",
            payload: mutation.body as object,
            clientTs: new Date(mutation.clientTs),
            syncedAt: new Date(),
          },
        });

        results.push({ mutationId: mutation.id, success: true });
      } catch {
        results.push({
          mutationId: mutation.id,
          success: false,
          error: "Failed to sync",
        });
      }
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

function extractEntityType(url: string): string {
  if (url.includes("/submissions")) return "submission";
  if (url.includes("/milestones")) return "milestone_progress";
  if (url.includes("/hints")) return "hint";
  return "unknown";
}

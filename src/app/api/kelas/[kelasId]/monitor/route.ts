import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "GURU") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { kelasId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(async () => {
        try {
          const members = await prisma.kelasMember.findMany({
            where: { kelasId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  activities: {
                    where: { kelasId },
                    orderBy: { lastEventAt: "desc" },
                    take: 1,
                    include: {
                      soal: { select: { learningModel: true } },
                    },
                  },
                },
              },
            },
          });

          const data = members.map((m) => {
            const activity = m.user.activities[0];
            const learningModel = activity?.soal?.learningModel;
            const stuckMinutes =
              activity?.stuckSince && learningModel === "PROBLEM_SOLVING"
                ? Math.floor(
                    (Date.now() - new Date(activity.stuckSince).getTime()) /
                      60000
                  )
                : undefined;

            return {
              userId: m.user.id,
              userName: m.user.name,
              soalId: activity?.soalId || null,
              status: activity?.status || "IDLE",
              lastEventAt: activity?.lastEventAt?.toISOString() || "",
              stuckMinutes,
              learningModel,
            };
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          controller.close();
          clearInterval(interval);
        }
      }, 3000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

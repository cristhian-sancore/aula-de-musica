import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { lessonId, completed } = await req.json();

    if (!lessonId) {
      return NextResponse.json({ error: "Faltando lessonId" }, { status: 400 });
    }

    if (completed) {
      // Mark as completed
      await prisma.lessonProgress.upsert({
        where: {
          studentId_lessonId: {
            studentId: session.user.id,
            lessonId: lessonId
          }
        },
        update: {
          completedAt: new Date()
        },
        create: {
          studentId: session.user.id,
          lessonId: lessonId,
          completedAt: new Date()
        }
      });
    } else {
      // Unmark as completed
      await prisma.lessonProgress.deleteMany({
        where: {
          studentId: session.user.id,
          lessonId: lessonId
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao registrar progresso:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');

    if (session.user.role === "STUDENT") {
      // Student fetching their own messages for a specific lesson
      if (!lessonId) return NextResponse.json({ error: "Faltando lessonId" }, { status: 400 });
      const messages = await prisma.lessonMessage.findMany({
        where: {
          studentId: session.user.id,
          lessonId: lessonId
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(messages);
    } else if (session.user.role === "TEACHER") {
      // Teacher fetching all messages for their modules
      const messages = await prisma.lessonMessage.findMany({
        where: {
          lesson: {
            module: {
              teacherId: session.user.id
            }
          }
        },
        include: {
          student: {
            select: { name: true, email: true }
          },
          lesson: {
            select: { title: true, module: { select: { title: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(messages);
    }

    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { lessonId, content } = await req.json();

    if (!lessonId || !content) {
      return NextResponse.json({ error: "Faltando lessonId ou content" }, { status: 400 });
    }

    const message = await prisma.lessonMessage.create({
      data: {
        studentId: session.user.id,
        lessonId,
        content
      }
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { messageId, reply } = await req.json();

    if (!messageId || !reply) {
      return NextResponse.json({ error: "Faltando messageId ou reply" }, { status: 400 });
    }

    const message = await prisma.lessonMessage.findUnique({
      where: { id: messageId },
      include: { lesson: { include: { module: true } } }
    });

    if (!message || message.lesson.module.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const updated = await prisma.lessonMessage.update({
      where: { id: messageId },
      data: {
        reply,
        repliedAt: new Date()
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao responder mensagem:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

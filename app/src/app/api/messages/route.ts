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
      // Teacher fetching all messages for their modules or lessons
      const messages = await prisma.lessonMessage.findMany({
        where: {
          OR: [
            { lesson: { teacherId: session.user.id } },
            { lesson: { module: { teacherId: session.user.id } } }
          ]
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
      },
      include: {
        student: true,
        lesson: true
      }
    });

    // Enviar notificação de WhatsApp para o professor
    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
    const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
    const TEACHER_WHATSAPP = process.env.TEACHER_WHATSAPP;

    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN && TEACHER_WHATSAPP) {
      const notifyMsg = `*Nova Dúvida na Plataforma!* 🙋‍♂️\n\nO aluno *${message.student.name}* enviou uma dúvida na aula *"${message.lesson.title}"*:\n\n_"${content}"_\n\nAcesse o seu painel de professor na aba de Mensagens para responder!`;

      await fetch(WHATSAPP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`,
          "apikey": WHATSAPP_API_TOKEN 
        },
        body: JSON.stringify({
          number: TEACHER_WHATSAPP,
          text: notifyMsg,
          message: notifyMsg
        })
      }).catch(e => console.error("Erro ao notificar professor no whatsapp", e));
    }

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

    const lessonTeacherId = message?.lesson.teacherId || message?.lesson.module?.teacherId;

    if (!message || lessonTeacherId !== session.user.id) {
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const instrument = searchParams.get("instrument");

    if (!instrument) {
      return NextResponse.json({ error: "Instrumento é obrigatório" }, { status: 400 });
    }

    const lessons = await prisma.videoLesson.findMany({
      where: {
        teacherId: session.user.id,
        instrument: instrument,
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(lessons);
  } catch (error) {
    console.error("Erro ao buscar aulas por instrumento:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { title, videoUrl, instrument, chapter } = body;

    if (!title || !videoUrl || !instrument || !chapter) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
    }

    // Achar a última ordem deste capítulo e instrumento
    const lastLesson = await prisma.videoLesson.findFirst({
      where: {
        teacherId: session.user.id,
        instrument: instrument,
        chapter: chapter,
      },
      orderBy: {
        order: "desc",
      },
    });

    const newOrder = lastLesson ? lastLesson.order + 1 : 0;

    const lesson = await prisma.videoLesson.create({
      data: {
        title,
        videoUrl,
        instrument,
        chapter,
        order: newOrder,
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar aula por instrumento:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

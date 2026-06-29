import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, videoUrl, chapter, order } = body;

    const existing = await prisma.videoLesson.findFirst({
      where: { id: id, teacherId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    }

    const updated = await prisma.videoLesson.update({
      where: { id: id },
      data: {
        title: title !== undefined ? title : existing.title,
        videoUrl: videoUrl !== undefined ? videoUrl : existing.videoUrl,
        chapter: chapter !== undefined ? chapter : existing.chapter,
        order: order !== undefined ? order : existing.order,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar aula:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.videoLesson.findFirst({
      where: { id: id, teacherId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    }

    await prisma.videoLesson.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir aula:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

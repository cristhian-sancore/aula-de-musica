import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "TEACHER" && session.user.role !== "STUDENT")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    let foundModule;

    if (session.user.role === "TEACHER") {
      foundModule = await prisma.module.findUnique({
        where: { id: id, teacherId: session.user.id },
        include: { lessons: true },
      });
    } else if (session.user.role === "STUDENT") {
      // Check if student is enrolled and active
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: session.user.id,
          moduleId: id,
          status: "ACTIVE" // Only ACTIVE students can view content
        }
      });

      if (!enrollment) {
        return NextResponse.json({ error: "Acesso não autorizado ou bloqueado" }, { status: 403 });
      }

      foundModule = await prisma.module.findUnique({
        where: { id: id },
        include: { lessons: true },
      });

      if (!foundModule) {
        return NextResponse.json({ error: "Módulo não encontrado" }, { status: 404 });
      }

      // Se o aluno selecionou um instrumento na matrícula, buscar as aulas específicas desse instrumento
      if (enrollment.instrument) {
        const instrumentLessons = await prisma.videoLesson.findMany({
          where: {
            teacherId: foundModule.teacherId,
            instrument: enrollment.instrument,
          },
          orderBy: {
            order: "asc",
          },
        });

        if (instrumentLessons.length > 0) {
          foundModule.lessons = instrumentLessons;
        }
      }

      const lessonIds = foundModule.lessons.map(l => l.id);

      // Get completed lessons for this student
      const completedProgress = await prisma.lessonProgress.findMany({
        where: {
          studentId: session.user.id,
          lessonId: { in: lessonIds }
        },
        select: { lessonId: true }
      });

      const completedLessonIds = completedProgress.map(p => p.lessonId);
      
      return NextResponse.json({
        ...foundModule,
        studentInstrument: enrollment.instrument,
        completedLessonIds
      });
    }

    if (!foundModule) {
      return NextResponse.json({ error: "Módulo não encontrado" }, { status: 404 });
    }

    return NextResponse.json(foundModule);
  } catch (error) {
    console.error("Erro ao buscar módulo:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, price, isMonthly, lessons, paymentMethods, durationMonths } = body;

    const formattedPaymentMethods = paymentMethods !== undefined ? (Array.isArray(paymentMethods) ? paymentMethods : (typeof paymentMethods === 'string' && paymentMethods.trim() ? paymentMethods.split(',').map((s: string) => s.trim()).filter(Boolean) : [])) : undefined;
    const parsedDuration = durationMonths !== undefined ? (durationMonths ? parseInt(durationMonths) : null) : undefined;
    const finalDuration = parsedDuration !== undefined ? ((parsedDuration && parsedDuration > 0) ? parsedDuration : null) : undefined;

    // A simple update approach: update the module details, and recreate the lessons
    // For a robust production app, you might want to upsert lessons instead.
    
    // First, verify ownership
    const existingModule = await prisma.module.findUnique({
      where: { id: id, teacherId: session.user.id }
    });

    if (!existingModule) {
      return NextResponse.json({ error: "Módulo não encontrado ou sem permissão" }, { status: 404 });
    }

    // Delete existing lessons
    await prisma.videoLesson.deleteMany({
      where: { moduleId: id }
    });

    const updatedModule = await prisma.module.update({
      where: {
        id: id,
      },
      data: {
        title,
        description,
        price: price ? parseFloat(price) : undefined,
        isMonthly: isMonthly !== undefined ? Boolean(isMonthly) : undefined,
        durationMonths: finalDuration,
        paymentMethods: formattedPaymentMethods,
        lessons: {
          create: lessons?.map((lesson: { title: string; videoUrl: string }, index: number) => ({
            title: lesson.title,
            videoUrl: lesson.videoUrl,
            order: index,
          })) || [],
        },
      },
      include: {
        lessons: true,
      },
    });

    return NextResponse.json(updatedModule);
  } catch (error) {
    console.error("Erro ao atualizar módulo:", error);
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

    const existingModule = await prisma.module.findUnique({
      where: { id: id, teacherId: session.user.id }
    });

    if (!existingModule) {
      return NextResponse.json({ error: "Módulo não encontrado ou sem permissão" }, { status: 404 });
    }

    await prisma.module.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar módulo:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

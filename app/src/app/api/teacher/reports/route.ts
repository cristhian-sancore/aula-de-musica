import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const teacherId = session.user.id;

    // 1. Buscar configurações do professor
    const settings = await prisma.teacherSettings.findUnique({
      where: { teacherId }
    });

    // 2. Buscar todos os alunos matriculados nos módulos desse professor
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        enrollments: {
          some: {
            module: { teacherId }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        createdAt: true,
        enrollments: {
          where: {
            module: { teacherId }
          },
          select: {
            id: true,
            status: true,
            instrument: true,
            paymentMethod: true,
            installments: true,
            dayOfWeek: true,
            classTime: true,
            horario: true,
            replacementCredits: true,
            module: {
              select: {
                title: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    });

    // 3. Buscar todas as faturas desses alunos
    const studentIds = students.map(s => s.id);
    const invoices = await prisma.invoice.findMany({
      where: {
        studentId: { in: studentIds }
      },
      include: {
        student: {
          select: { name: true, whatsapp: true }
        }
      },
      orderBy: { dueDate: "desc" }
    });

    // 4. Buscar histórico de agendamentos e chamadas recentes (últimos 90 dias até os próximos 30)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const schedules = await prisma.classSchedule.findMany({
      where: {
        teacherId,
        date: { gte: ninetyDaysAgo }
      },
      include: {
        student: {
          select: { name: true }
        },
        attendance: true
      },
      orderBy: { date: "desc" }
    });

    const teacherUser = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { image: true }
    });

    return NextResponse.json({
      platformName: settings?.platformName || "Aula de Música 2.0",
      teacherName: session.user.name,
      teacherImage: teacherUser?.image || session.user.image || null,
      students,
      invoices,
      schedules
    });
  } catch (error) {
    console.error("Erro ao gerar dados de relatório:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

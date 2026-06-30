import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    const { status, observation } = data;

    // Verify if schedule exists and belongs to this teacher
    const schedule = await prisma.classSchedule.findUnique({
      where: { id },
      include: { attendance: true, student: true }
    });

    if (!schedule || schedule.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    // Upsert attendance
    const attendance = await prisma.attendance.upsert({
      where: {
        classScheduleId: id
      },
      update: {
        status,
        observation
      },
      create: {
        classScheduleId: id,
        status,
        observation
      }
    });

    // Update schedule status to COMPLETED if attendance is marked
    if (schedule.status === 'SCHEDULED') {
      await prisma.classSchedule.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });
    }

    // Logic for replacement credits
    if (status === 'JUSTIFIED') {
      // Se já não tinha ganhado crédito antes por essa aula (para evitar duplicação)
      if (!schedule.attendance || schedule.attendance.status !== 'JUSTIFIED') {
        // Encontra o enrollment ativo (simplificação: pega o primeiro)
        const enrollment = await prisma.enrollment.findFirst({
          where: { studentId: schedule.studentId },
          orderBy: { createdAt: 'desc' }
        });
        
        if (enrollment) {
          await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { replacementCredits: { increment: 1 } }
          });
        }
      }
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ error: 'Erro ao registrar chamada' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const schedule = await prisma.classSchedule.findUnique({
      where: { id }
    });

    if (!schedule || schedule.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Agendamento não encontrado ou sem permissão' }, { status: 404 });
    }

    await prisma.classSchedule.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule from attendance:', error);
    return NextResponse.json({ error: 'Erro ao deletar agendamento' }, { status: 500 });
  }
}

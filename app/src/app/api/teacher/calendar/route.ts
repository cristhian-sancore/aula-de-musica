import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      teacherId: session.user.id
    };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Auto-preenchimento presencial: buscar alunos matriculados no professor para gerar aulas automaticamente
      const enrollments = await prisma.enrollment.findMany({
        where: {
          module: { teacherId: session.user.id },
          status: { in: ['ACTIVE', 'PENDING_PAYMENT'] }
        },
        include: { student: true }
      });

      for (const enc of enrollments) {
        let dayOfWeekVal: number | null = enc.dayOfWeek;
        let classTimeVal: string | null = enc.classTime;

        if (dayOfWeekVal === null && enc.horario) {
          const parts = enc.horario.split("-");
          if (parts.length >= 2 && !isNaN(Number(parts[0]))) {
            dayOfWeekVal = Number(parts[0]);
            classTimeVal = `${parts[1].padStart(2, '0')}:00`;
          }
        }

        if (dayOfWeekVal !== null) {
          const current = new Date(start);
          while (current <= end) {
            if (current.getDay() === dayOfWeekVal) {
              const scheduleDate = new Date(current);
              if (classTimeVal) {
                const [hh, mm] = classTimeVal.split(":");
                scheduleDate.setHours(Number(hh), Number(mm), 0, 0);
              } else {
                scheduleDate.setHours(14, 0, 0, 0);
              }

              const dayStart = new Date(scheduleDate);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(scheduleDate);
              dayEnd.setHours(23, 59, 59, 999);

              const exists = await prisma.classSchedule.findFirst({
                where: {
                  teacherId: session.user.id,
                  studentId: enc.studentId,
                  date: { gte: dayStart, lte: dayEnd }
                }
              });

              if (!exists) {
                await prisma.classSchedule.create({
                  data: {
                    teacherId: session.user.id,
                    studentId: enc.studentId,
                    date: scheduleDate,
                    status: 'SCHEDULED'
                  }
                });
              }
            }
            current.setDate(current.getDate() + 1);
          }
        }
      }

      where.date = {
        gte: start,
        lte: end
      };
    }

    const schedules = await prisma.classSchedule.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, email: true, whatsapp: true }
        },
        attendance: true
      },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Erro ao buscar agenda' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { studentId, date } = data;

    if (!studentId || !date) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const schedule = await prisma.classSchedule.create({
      data: {
        teacherId: session.user.id,
        studentId,
        date: new Date(date),
        status: 'SCHEDULED'
      },
      include: {
        student: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
  }
}

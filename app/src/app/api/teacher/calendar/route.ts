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
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
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

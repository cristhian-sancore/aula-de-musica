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
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    // Filter invoices by students that belong to this teacher's modules
    const invoices = await prisma.invoice.findMany({
      where: {
        ...where,
        student: {
          enrollments: {
            some: {
              module: {
                teacherId: session.user.id
              }
            }
          }
        }
      },
      include: {
        student: {
          select: { name: true, email: true, whatsapp: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Erro ao buscar faturas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { studentId, amount, dueDate, month, year } = data;

    if (!studentId || !amount || !dueDate || !month || !year) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        month: parseInt(month),
        year: parseInt(year),
        status: 'PENDING'
      }
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Erro ao criar fatura' }, { status: 500 });
  }
}

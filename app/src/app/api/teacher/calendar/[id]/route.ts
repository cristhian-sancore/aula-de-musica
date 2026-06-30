import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Erro ao deletar agendamento' }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: studentId } = await params;

    // Verify if student exists and has role STUDENT
    const student = await prisma.user.findUnique({
      where: { id: studentId }
    });

    if (!student || student.role !== "STUDENT") {
      return NextResponse.json({ error: "Aluno não encontrado ou inválido" }, { status: 404 });
    }

    // Verify if the student belongs to at least one module taught by this teacher
    const enrollmentCount = await prisma.enrollment.count({
      where: {
        studentId: studentId,
        module: { teacherId: session.user.id }
      }
    });

    if (enrollmentCount === 0) {
      return NextResponse.json({ error: "Sem permissão para gerenciar ou excluir este aluno" }, { status: 403 });
    }

    // Delete enrollments first
    await prisma.enrollment.deleteMany({
      where: { studentId: studentId }
    });

    // Delete user
    await prisma.user.delete({
      where: { id: studentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir aluno:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

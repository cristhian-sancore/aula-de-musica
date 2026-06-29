import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: studentId } = await params;
    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "A nova senha deve ter no mínimo 6 caracteres" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Sem permissão para alterar a senha deste aluno" }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: studentId },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao resetar senha do aluno:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

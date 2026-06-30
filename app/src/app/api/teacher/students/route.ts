import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar todos os alunos que estão matriculados em algum módulo desse professor
    // Ou como é sistema para um professor, apenas role: 'STUDENT'
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT"
      },
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("Erro ao buscar alunos:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

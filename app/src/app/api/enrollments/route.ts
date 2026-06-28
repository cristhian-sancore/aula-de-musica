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

    const enrollments = await prisma.enrollment.findMany({
      where: {
        module: {
          teacherId: session.user.id
        }
      },
      include: {
        student: true,
        module: true
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(enrollments);
  } catch (error) {
    console.error("Erro ao buscar matrículas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

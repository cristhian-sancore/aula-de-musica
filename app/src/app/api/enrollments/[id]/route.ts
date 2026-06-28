import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !["PENDING_PAYMENT", "ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Verify ownership of the module the enrollment belongs to
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { id: params.id },
      include: { module: true }
    });

    if (!existingEnrollment || existingEnrollment.module.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Matrícula não encontrada ou sem permissão" }, { status: 404 });
    }

    const updated = await prisma.enrollment.update({
      where: { id: params.id },
      data: { status }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar matrícula:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const { status } = body;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        student: true
      }
    });

    if (!existingInvoice || existingInvoice.student.role !== "STUDENT") {
      return NextResponse.json({ error: "Fatura não encontrada ou inválida" }, { status: 404 });
    }

    const data: any = { status };
    if (status === "PAID") {
      data.paidAt = new Date();
    } else if (status === "PENDING" || status === "OVERDUE") {
      data.paidAt = null;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Erro ao atualizar fatura:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        student: true
      }
    });

    if (!existingInvoice || existingInvoice.student.role !== "STUDENT") {
      return NextResponse.json({ error: "Fatura não encontrada ou inválida" }, { status: 404 });
    }

    await prisma.invoice.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar fatura:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

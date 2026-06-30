import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const whereClause: any = {};
    if (month) whereClause.month = parseInt(month);
    if (year) whereClause.year = parseInt(year);

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        dueDate: "asc"
      }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Erro ao buscar faturas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { studentId, amount, dueDate, month, year } = body;

    const invoice = await prisma.invoice.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        month: parseInt(month),
        year: parseInt(year),
        status: "PENDING"
      }
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Erro ao criar fatura:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

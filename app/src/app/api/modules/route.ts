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

    const modules = await prisma.module.findMany({
      where: {
        teacherId: session.user.id,
      },
      include: {
        lessons: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(modules);
  } catch (error) {
    console.error("Erro ao buscar módulos:", error);
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
    const { title, description, price, isMonthly, lessons, paymentMethods } = body;

    if (!title || price === undefined) {
      return NextResponse.json({ error: "Título e preço são obrigatórios" }, { status: 400 });
    }

    const formattedPaymentMethods = Array.isArray(paymentMethods) ? paymentMethods : (typeof paymentMethods === 'string' && paymentMethods.trim() ? paymentMethods.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

    const newModule = await prisma.module.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        isMonthly: Boolean(isMonthly),
        paymentMethods: formattedPaymentMethods,
        teacherId: session.user.id,
        lessons: {
          create: lessons?.map((lesson: { title: string; videoUrl: string }, index: number) => ({
            title: lesson.title,
            videoUrl: lesson.videoUrl,
            order: index,
          })) || [],
        },
      },
      include: {
        lessons: true,
      },
    });

    return NextResponse.json(newModule, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar módulo:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

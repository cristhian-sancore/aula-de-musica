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

    const links = await prisma.customLink.findMany({
      where: {
        teacherId: session.user.id,
      },
      include: {
        modules: {
          include: {
            module: true,
          }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("Erro ao buscar links:", error);
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
    const { studentName, moduleIds } = body;

    if (!moduleIds || !Array.isArray(moduleIds) || moduleIds.length === 0) {
      return NextResponse.json({ error: "É necessário selecionar pelo menos um módulo" }, { status: 400 });
    }

    // Create the CustomLink and connect the selected modules
    const newLink = await prisma.customLink.create({
      data: {
        studentName,
        teacherId: session.user.id,
        modules: {
          create: moduleIds.map((moduleId: string) => ({
            moduleId: moduleId,
          })),
        },
      },
      include: {
        modules: {
          include: {
            module: true,
          }
        }
      }
    });

    return NextResponse.json(newLink, { status: 201 });
  } catch (error) {
    console.error("Erro ao gerar link:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

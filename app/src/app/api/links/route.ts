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
    const { studentName, moduleIds, instruments, paymentMethods } = body;

    if (!moduleIds || !Array.isArray(moduleIds) || moduleIds.length === 0) {
      return NextResponse.json({ error: "É necessário selecionar pelo menos um módulo" }, { status: 400 });
    }

    // Generate friendly token
    let tokenValue = undefined;
    const nameToSlug = studentName && studentName.trim() ? studentName : "convite-exclusivo";
    
    const normalized = nameToSlug.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    tokenValue = slug ? `${slug}-${randomSuffix}` : `link-${randomSuffix}`;

    // Create the CustomLink and connect the selected modules
    const newLink = await prisma.customLink.create({
      data: {
        token: tokenValue,
        studentName,
        teacherId: session.user.id,
        instruments: Array.isArray(instruments) ? instruments : [],
        paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : [],
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

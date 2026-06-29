import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const link = await prisma.customLink.findUnique({
      where: {
        token: token,
      },
      include: {
        modules: {
          include: {
            module: true,
          }
        },
        teacher: {
          select: {
            name: true,
            image: true,
            email: true,
            whatsapp: true,
            settings: {
              select: {
                cardTaxRate: true,
                enrollmentFee: true,
              }
            }
          }
        }
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });
    }

    if (link.status === "INACTIVE") {
      return NextResponse.json({ error: "Este link foi desativado" }, { status: 403 });
    }

    return NextResponse.json(link);
  } catch (error) {
    console.error("Erro ao buscar link:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token: id } = await params;
    // The parameter is called token in the folder structure, but we pass the ID
    await prisma.customLink.delete({
      where: {
        id: id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir link:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token: id } = await params;
    const body = await req.json();
    const { studentName, moduleIds, instruments, paymentMethods } = body;

    if (!moduleIds || !Array.isArray(moduleIds) || moduleIds.length === 0) {
      return NextResponse.json({ error: "É necessário selecionar pelo menos um módulo" }, { status: 400 });
    }

    const updatedLink = await prisma.customLink.update({
      where: { id: id },
      data: {
        studentName,
        instruments: Array.isArray(instruments) ? instruments : [],
        paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : [],
        modules: {
          deleteMany: {}, // Delete old module relations
          create: moduleIds.map((moduleId: string) => ({
            moduleId: moduleId,
          })),
        },
      },
    });

    return NextResponse.json(updatedLink, { status: 200 });
  } catch (error) {
    console.error("Erro ao editar link:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const link = await prisma.customLink.findUnique({
      where: {
        token: params.token,
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
            email: true,
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

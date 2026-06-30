import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, whatsapp: true, email: true, image: true }
    });

    if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { name, whatsapp, email, image, newPassword, currentPassword } = body;

    const dataToUpdate: any = { name, whatsapp, email, image };

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "A senha atual é obrigatória para alterar a senha." }, { status: 400 });
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: session.user.id }
      });

      if (!existingUser || !(await bcrypt.compare(currentPassword, existingUser.password))) {
        return NextResponse.json({ error: "A senha atual está incorreta." }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "A nova senha deve ter no mínimo 6 caracteres" }, { status: 400 });
      }
      dataToUpdate.password = await bcrypt.hash(newPassword, 10);
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

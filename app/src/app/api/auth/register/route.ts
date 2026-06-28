import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, name, email, password, whatsapp, selectedModules } = body;

    if (!token || !name || !email || !password || !selectedModules || selectedModules.length === 0) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // 1. Verify the link
    const link = await prisma.customLink.findUnique({
      where: { token },
      include: { modules: true }
    });

    if (!link || link.status !== "ACTIVE") {
      return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 400 });
    }

    // Verify if the selected modules are actually part of the link
    const validModuleIds = link.modules.map(m => m.moduleId);
    const isValidSelection = selectedModules.every((id: string) => validModuleIds.includes(id));

    if (!isValidSelection) {
      return NextResponse.json({ error: "Módulos selecionados inválidos" }, { status: 400 });
    }

    // 2. Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      // If user exists, just create enrollments (ignoring password creation for simplicity here, 
      // though ideally they should login to add to existing account. We'll proceed if we want to just append).
      // For this flow, let's assume it's a new user or we just update their whatsapp.
      if (user.role !== "STUDENT") {
         return NextResponse.json({ error: "E-mail em uso por um administrador/professor" }, { status: 400 });
      }
    } else {
      // 3. Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          whatsapp,
          role: "STUDENT"
        }
      });
    }

    // 4. Create enrollments (PENDING_PAYMENT)
    for (const moduleId of selectedModules) {
      // Use upsert or check to avoid duplicate enrollments
      await prisma.enrollment.upsert({
        where: {
          studentId_moduleId: {
            studentId: user.id,
            moduleId: moduleId
          }
        },
        update: {}, // Do nothing if it exists
        create: {
          studentId: user.id,
          moduleId: moduleId,
          status: "PENDING_PAYMENT"
        }
      });
    }

    // 5. Update link status to USED (optional, if we want one-time links)
    // For now, let's keep it active so the teacher can re-use it, or mark it USED if it was specific.
    // The requirement says "como um cardápio", usually it's one link per student. 
    await prisma.customLink.update({
      where: { id: link.id },
      data: { status: "USED" }
    });

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Erro no registro do aluno:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

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
                availableSlots: true,
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

    // Process available slots
    let availableSlots: { day: number, time: string, capacity: number }[] = [];
    
    if (link.teacher.settings?.availableSlots) {
      const slots = link.teacher.settings.availableSlots as any;
      if (Array.isArray(slots)) {
        // Fetch active enrollments for this teacher to count how many students are in each slot
        const activeEnrollments = await prisma.enrollment.findMany({
          where: {
            module: { teacherId: link.teacherId },
            status: { in: ["ACTIVE", "PENDING_PAYMENT"] },
            horario: { not: null }
          },
          select: { horario: true }
        });

        // Count occurrences of each slot (Format is "day-time", e.g., "1-14:00")
        const slotCounts: Record<string, number> = {};
        for (const e of activeEnrollments) {
          if (e.horario) {
            slotCounts[e.horario] = (slotCounts[e.horario] || 0) + 1;
          }
        }

        // Filter slots where count < capacity
        availableSlots = slots.filter((slot: any) => {
          const slotKey = slot.endTime ? `${slot.day}-${slot.time}-${slot.endTime}` : `${slot.day}-${slot.time}`;
          const currentCount = slotCounts[slotKey] || 0;
          const capacity = slot.capacity || 1;
          return currentCount < capacity;
        });
      }
    }

    const responseData = {
      ...link,
      computedAvailableSlots: availableSlots
    };

    return NextResponse.json(responseData);
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

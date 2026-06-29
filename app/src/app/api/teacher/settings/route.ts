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

    let settings = await prisma.teacherSettings.findUnique({
      where: {
        teacherId: session.user.id,
      },
    });

    if (!settings) {
      settings = await prisma.teacherSettings.create({
        data: {
          teacherId: session.user.id,
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Erro ao buscar configurações do professor:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { cardTaxRate, enrollmentFee, defaultInstruments, defaultPaymentMethods, platformName, availableSlots, showPriceAsMonthly, sumEnrollmentFee } = body;

    const settings = await prisma.teacherSettings.upsert({
      where: {
        teacherId: session.user.id,
      },
      update: {
        cardTaxRate: typeof cardTaxRate === 'number' ? cardTaxRate : 0,
        enrollmentFee: typeof enrollmentFee === 'number' ? enrollmentFee : 90.00,
        sumEnrollmentFee: typeof sumEnrollmentFee === 'boolean' ? sumEnrollmentFee : false,
        defaultInstruments: Array.isArray(defaultInstruments) ? defaultInstruments : [],
        defaultPaymentMethods: Array.isArray(defaultPaymentMethods) ? defaultPaymentMethods : [],
        platformName: typeof platformName === 'string' ? platformName : "Aula de Música",
        showPriceAsMonthly: typeof showPriceAsMonthly === 'boolean' ? showPriceAsMonthly : false,
        availableSlots: availableSlots !== undefined ? availableSlots : null,
      },
      create: {
        teacherId: session.user.id,
        cardTaxRate: typeof cardTaxRate === 'number' ? cardTaxRate : 0,
        enrollmentFee: typeof enrollmentFee === 'number' ? enrollmentFee : 90.00,
        sumEnrollmentFee: typeof sumEnrollmentFee === 'boolean' ? sumEnrollmentFee : false,
        defaultInstruments: Array.isArray(defaultInstruments) ? defaultInstruments : [],
        defaultPaymentMethods: Array.isArray(defaultPaymentMethods) ? defaultPaymentMethods : [],
        platformName: typeof platformName === 'string' ? platformName : "Aula de Música",
        showPriceAsMonthly: typeof showPriceAsMonthly === 'boolean' ? showPriceAsMonthly : false,
        availableSlots: availableSlots !== undefined ? availableSlots : null,
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Erro ao salvar configurações do professor:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

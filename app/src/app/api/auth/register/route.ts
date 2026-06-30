import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, name, email, password, whatsapp, selectedModules, instrument, paymentMethod, installments, responsavel, horario, cidade, conheceu, observacoes } = body;

    if (!token || !name || !email || !password || !selectedModules || selectedModules.length === 0) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // 1. Verify the link
    const link = await prisma.customLink.findUnique({
      where: { token },
      include: { 
        modules: true,
        teacher: { include: { settings: true } }
      }
    });

    if (!link || link.status !== "ACTIVE") {
      return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 400 });
    }

    // Verify if the selected modules are actually part of the link
    const validModuleIds = link.modules.map((m: { moduleId: string }) => m.moduleId);
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
          status: "PENDING_PAYMENT",
          instrument: instrument || null,
          paymentMethod: paymentMethod || null,
          installments: installments ? parseInt(installments, 10) : 1,
          responsavel: responsavel || null,
          horario: horario || null,
          cidade: cidade || null,
          conheceu: conheceu || null,
          observacoes: observacoes || null
        }
      });
    }

    // 5. Update link status to USED
    await prisma.customLink.update({
      where: { id: link.id },
      data: { status: "USED" }
    });

    // 6. Direct WhatsApp Integration (Notificar Professor)
    try {
      const rawUrl = process.env.WHATSAPP_API_URL || "http://evolution-api_aula:8080";
      const EVOLUTION_API_URL = rawUrl.startsWith("http") ? new URL(rawUrl).origin : "http://evolution-api_aula:8080";
      const EVOLUTION_API_KEY = process.env.WHATSAPP_API_TOKEN || "seu_token_global_evolution";
      
      const instanceName = `teacher_${link.teacherId}`;
      const evolutionEndpoint = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;
      
      const TEACHER_WHATSAPP = process.env.TEACHER_WHATSAPP; 

      if (TEACHER_WHATSAPP) {
        // Fetch module names to show in the message
        const selectedModulesData = await prisma.module.findMany({
          where: { id: { in: selectedModules } },
          select: { title: true }
        });
        const planNames = selectedModulesData.map(m => m.title).join(", ");

        const DAYS_OF_WEEK = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        let horarioText = "";
        if (horario) {
          const parts = horario.split("-");
          if (parts.length === 3 && !isNaN(Number(parts[0]))) {
            horarioText = `\nHorário: ${DAYS_OF_WEEK[Number(parts[0])]} das ${parts[1]} às ${parts[2]}`;
          } else if (parts.length === 2 && !isNaN(Number(parts[0]))) {
            horarioText = `\nHorário: ${DAYS_OF_WEEK[Number(parts[0])]} às ${parts[1]}`;
          } else {
            horarioText = `\nHorário: ${horario}`;
          }
        }

        const instrumentText = instrument ? `\nInstrumento: ${instrument}` : '';
        const paymentText = paymentMethod ? `\nPagamento: ${paymentMethod}${installments ? ` em ${installments}x` : ''}` : '';
        
        const enrollmentFee = link.teacher?.settings?.enrollmentFee || 90;
        const sumEnrollmentFee = link.teacher?.settings?.sumEnrollmentFee !== false;
        
        let matriculaText = "";
        if (enrollmentFee > 0) {
          if (sumEnrollmentFee) {
            matriculaText = `\nTaxa de Matrícula: R$ ${enrollmentFee.toFixed(2)} (Somada ao valor do plano)`;
          } else {
            matriculaText = `\nTaxa de Matrícula: R$ ${enrollmentFee.toFixed(2)} (Paga separadamente)`;
          }
        }
        
        const mensagem = `*Nova Matrícula Solicitada!*\n\nO aluno *${name}* (${whatsapp}) acabou de se cadastrar através do seu link exclusivo.\n\nPlano Escolhido: *${planNames}*${matriculaText}${instrumentText}${paymentText}${horarioText}\n\nAcesse o painel para liberar o acesso assim que confirmar o pagamento.`;

        await fetch(evolutionEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_KEY
          },
          body: JSON.stringify({
            number: TEACHER_WHATSAPP,
            text: mensagem
          })
        });
        console.log("Notificação de WhatsApp enviada ao professor.");

        // Enviar mensagem para o aluno
        let studentPhoneStr = whatsapp.replace(/\D/g, ''); // Removes all non-numeric chars
        // Prepend 55 if it's missing (usually length is 10 or 11 for Brazil numbers without country code)
        if (studentPhoneStr.length === 10 || studentPhoneStr.length === 11) {
          studentPhoneStr = '55' + studentPhoneStr;
        }
        
        if (studentPhoneStr) {
           const studentMsg = `Olá, *${name}*! 🎵\n\nRecebemos a sua solicitação de reserva de vaga para as aulas de música.\n\n✅ *O professor já foi notificado!*\n\nEm breve ele entrará em contato por aqui mesmo para confirmar os horários disponíveis e as instruções de pagamento.\n\nFique de olho! 👀`;
           await fetch(evolutionEndpoint, {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
               "apikey": EVOLUTION_API_KEY 
             },
             body: JSON.stringify({
               number: studentPhoneStr,
               text: studentMsg
             })
           });
           console.log("Notificação de WhatsApp enviada ao aluno.");
        }
      } else {
        console.warn("Variáveis de ambiente do WhatsApp não configuradas. Notificação não enviada.");
      }
    } catch (wpError) {
      console.error("Falha ao enviar notificação de WhatsApp:", wpError);
    }

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Erro no registro do aluno:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

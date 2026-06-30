import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const rawUrl = process.env.WHATSAPP_API_URL || "http://evolution-api_aula:8080";
const EVOLUTION_API_URL = rawUrl.startsWith("http") ? new URL(rawUrl).origin : "http://evolution-api_aula:8080";
const EVOLUTION_API_KEY = process.env.WHATSAPP_API_TOKEN || "seu_token_global_evolution";

// Função utilitária para pegar o nome da instância baseada no ID do professor
const getInstanceName = (teacherId: string) => `teacher_${teacherId}`;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const instanceName = getInstanceName(session.user.id);

    // 1. Tentar pegar o status da conexão
    const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    });

    if (stateRes.ok) {
      const stateData = await stateRes.json();
      
      // Se não estiver "open", tenta buscar o base64 (qr code)
      if (stateData.instance?.state !== "open") {
        const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
          method: "GET",
          headers: {
            "apikey": EVOLUTION_API_KEY,
          },
        });
        
        if (connectRes.ok) {
          const connectData = await connectRes.json();
          return NextResponse.json({
            status: stateData.instance?.state || "connecting",
            qr: connectData.base64,
            instanceName
          });
        }
      }

      return NextResponse.json({
        status: stateData.instance?.state || "unknown",
        instanceName
      });
    }

    // Se retornar 404 (instância não existe), retorna status indicando que não foi criada ainda
    return NextResponse.json({
      status: "uninitialized",
      instanceName
    });

  } catch (error) {
    console.error("Error fetching whatsapp status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const action = await request.json();
    const instanceName = getInstanceName(session.user.id);

    if (action.type === "CREATE") {
      // Cria a instância
      const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: "POST",
        headers: {
          "apikey": EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error("Failed to create instance:", err);
        return NextResponse.json({ error: "Falha ao criar instância" }, { status: 400 });
      }

      // Aguarda um momento para a API processar
      await new Promise(r => setTimeout(r, 2000));

      // Busca o QR code (connect endpoint)
      const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        method: "GET",
        headers: {
          "apikey": EVOLUTION_API_KEY,
        },
      });

      if (connectRes.ok) {
        const connectData = await connectRes.json();
        return NextResponse.json({
          status: "connecting",
          qr: connectData.base64,
          instanceName
        });
      }
      
      return NextResponse.json({ status: "created", instanceName });
    } else if (action.type === "LOGOUT") {
      // Desconectar o WhatsApp
      const logoutRes = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers: {
          "apikey": EVOLUTION_API_KEY,
        },
      });
      return NextResponse.json({ success: logoutRes.ok });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("Error managing whatsapp instance:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

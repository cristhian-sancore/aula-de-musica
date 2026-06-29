import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id, role: "TEACHER" },
      select: { image: true },
    });

    if (!user || !user.image) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Check if it's a data URI
    const dataUriMatch = user.image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (dataUriMatch) {
      const mimeType = dataUriMatch[1];
      const base64Data = dataUriMatch[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        },
      });
    }

    // If it's a regular URL
    if (user.image.startsWith("http")) {
      return NextResponse.redirect(user.image);
    }

    return new NextResponse("Not Found", { status: 404 });
  } catch (error) {
    console.error("Erro ao carregar avatar", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

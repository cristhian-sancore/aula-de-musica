import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.json({
    next_public: process.env.NEXT_PUBLIC_INVITE_BASE_URL || null,
    invite_base: process.env.INVITE_BASE_URL || null,
    next_public_bracket: process.env['NEXT_PUBLIC_INVITE_BASE_URL'] || null,
    all_env: Object.keys(process.env).filter(k => k.includes('INVITE'))
  });
}

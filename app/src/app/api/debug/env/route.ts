import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    next_public: process.env.NEXT_PUBLIC_INVITE_BASE_URL || null,
    invite_base: process.env.INVITE_BASE_URL || null,
    next_public_bracket: process.env['NEXT_PUBLIC_INVITE_BASE_URL'] || null,
    all_env: Object.keys(process.env).filter(k => k.includes('INVITE'))
  });
}

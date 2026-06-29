import { LoginForm } from "./LoginForm";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Fetch the first teacher's logo to display on the login page
  const teacher = await prisma.user.findFirst({
    where: { role: "TEACHER" },
    select: { image: true },
  });

  const logoUrl = teacher?.image || null;

  return <LoginForm logoUrl={logoUrl} />;
}

import { LoginForm } from "./LoginForm";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    if (session.user.role === "STUDENT") {
      redirect("/student");
    } else {
      redirect("/teacher");
    }
  }

  // Fetch the first teacher's logo to display on the login page
  const teacher = await prisma.user.findFirst({
    where: { role: "TEACHER" },
    select: { image: true },
  });

  const logoUrl = teacher?.image || null;

  return <LoginForm logoUrl={logoUrl} />;
}

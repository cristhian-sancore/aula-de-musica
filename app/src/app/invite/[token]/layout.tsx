import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { token } = await params;

    const link = await prisma.customLink.findUnique({
      where: { token },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            image: true,
            settings: true,
          },
        },
      },
    });

    if (!link) {
      return {
        title: "Convite - Link Inválido",
      };
    }

    const platformName = link.teacher?.settings?.platformName || "Aula de Música";
    const teacherName = link.teacher?.name || "Professor(a)";

    const baseUrl = process.env.NEXTAUTH_URL || "https://aula.cristhiansancore.com.br";
    const ogImageUrl = link.teacher?.image ? `${baseUrl}/api/teacher/${link.teacher.id}/avatar` : "";

    return {
      title: `Proposta de Matrícula - ${platformName}`,
      description: `Confira a proposta especial de ${teacherName} para as suas aulas de música!`,
      openGraph: {
        title: `Proposta de Matrícula - ${platformName}`,
        description: `Confira a proposta especial de ${teacherName} para as suas aulas de música!`,
        images: ogImageUrl ? [ogImageUrl] : [],
        url: `${baseUrl}/invite/${token}`,
      },
    };
  } catch (error) {
    return {
      title: "Proposta de Matrícula",
    };
  }
}

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

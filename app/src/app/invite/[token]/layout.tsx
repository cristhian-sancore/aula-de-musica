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

    return {
      title: `Proposta de Matrícula - ${platformName}`,
      description: `Confira a proposta especial de ${teacherName} para as suas aulas de música!`,
      openGraph: {
        title: `Proposta de Matrícula - ${platformName}`,
        description: `Confira a proposta especial de ${teacherName} para as suas aulas de música!`,
        images: link.teacher?.image ? [link.teacher.image] : [],
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

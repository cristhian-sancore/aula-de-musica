import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: "--font-outfit",
});

import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const teacherSettings = await prisma.teacherSettings.findFirst({
      include: {
        teacher: true
      }
    });
    const platformName = teacherSettings?.platformName || "Aula de Música 2.0 - LMS";
    const iconUrl = teacherSettings?.teacher?.image || "/favicon.ico";

    return {
      title: platformName,
      description: "Plataforma premium para ensino de música",
      icons: {
        icon: iconUrl,
        apple: iconUrl,
      }
    };
  } catch (error) {
    return {
      title: "Aula de Música 2.0 - LMS",
      description: "Plataforma premium para ensino de música",
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={outfit.variable}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

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
    const rawImage = teacherSettings?.teacher?.image;
    
    // Evitar strings base64 gigantes no header do favicon que quebram navegadores
    const iconUrl = (rawImage && (rawImage.startsWith("http://") || rawImage.startsWith("https://") || (rawImage.startsWith("data:") && rawImage.length < 5000))) 
      ? rawImage 
      : "/favicon.ico";

    return {
      title: platformName,
      description: "Plataforma premium para ensino de música",
      icons: {
        icon: iconUrl,
        shortcut: "/favicon.ico",
        apple: iconUrl,
      }
    };
  } catch (error) {
    return {
      title: "Aula de Música 2.0 - LMS",
      description: "Plataforma premium para ensino de música",
      icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
      }
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

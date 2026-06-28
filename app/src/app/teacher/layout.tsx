import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import "./layout.css";
import Link from "next/link";
import { BookOpen, Users, LayoutDashboard, Link as LinkIcon, LogOut, Settings } from "lucide-react";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  return (
    <div className="teacher-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Aula de Música</h2>
          <span className="badge">Painel Professor</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link href="/teacher" className="nav-link">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link href="/teacher/modules" className="nav-link">
            <BookOpen size={20} />
            <span>Módulos e Aulas</span>
          </Link>
          <Link href="/teacher/links" className="nav-link">
            <LinkIcon size={20} />
            <span>Gerar Link</span>
          </Link>
          <Link href="/teacher/students" className="nav-link">
            <Users size={20} />
            <span>Alunos</span>
          </Link>
          <Link href="/teacher/settings" className="nav-link">
            <Settings size={20} />
            <span>Configurações</span>
          </Link>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{session.user.name?.[0] || "P"}</div>
            <div className="details">
              <strong>{session.user.name}</strong>
              <span>Professor</span>
            </div>
          </div>
          <Link href="/api/auth/signout" className="nav-link logout">
            <LogOut size={20} />
            <span>Sair</span>
          </Link>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <h1>Bem-vindo de volta, {session.user.name?.split(" ")[0]}!</h1>
        </header>
        <div className="content-area animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

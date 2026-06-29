import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import "./layout.css";
import Link from "next/link";
import { BookOpen, LogOut, User } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  return (
    <div className="student-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Aula de Música</h2>
          <span className="badge-student">Área do Aluno</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link href="/student" className="nav-link">
            <BookOpen size={20} />
            <span>Meus Cursos</span>
          </Link>
          <Link href="/student/profile" className="nav-link">
            <User size={20} />
            <span>Minha Conta</span>
          </Link>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{session.user.name?.[0] || "A"}</div>
            <div className="details">
              <strong>{session.user.name}</strong>
              <span>Aluno</span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <h1>Olá, {session.user.name?.split(" ")[0]}! Que bom ter você aqui.</h1>
        </header>
        <div className="content-area animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Users, BookOpen, Link as LinkIcon, DollarSign } from "lucide-react";
import "./dashboard.css";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "TEACHER") {
    return null;
  }

  // Fetch some basic stats
  const totalStudents = await prisma.user.count({
    where: { role: "STUDENT" }
  });

  const totalModules = await prisma.module.count({
    where: { teacherId: session.user.id }
  });

  const activeLinks = await prisma.customLink.count({
    where: { teacherId: session.user.id, status: "ACTIVE" }
  });

  // Calculate total revenue (simulated based on active enrollments)
  // In a real scenario, this would sum successful payments
  const enrollments = await prisma.enrollment.findMany({
    where: { status: "ACTIVE", module: { teacherId: session.user.id } },
    include: { module: true, student: true }
  });

  const totalRevenue = enrollments.reduce((acc: number, curr: any) => acc + curr.module.price, 0);

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "rgba(218, 123, 26, 0.1)", color: "var(--color-primary)" }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>Alunos Cadastrados</h3>
            <p className="stat-value">{totalStudents}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <h3>Módulos Criados</h3>
            <p className="stat-value">{totalModules}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
            <LinkIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>Cardápios Ativos</h3>
            <p className="stat-value">{activeLinks}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: "rgba(22, 163, 74, 0.1)", color: "#16a34a" }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <h3>Faturamento Estimado</h3>
            <p className="stat-value">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>Últimas Matrículas</h2>
          {enrollments.length > 0 ? (
            <ul className="recent-list">
              {enrollments.slice(0, 5).map(enc => (
                <li key={enc.id} className="recent-item">
                  <div className="recent-info">
                    <strong>{enc.student.name}</strong>
                    <span>{enc.module.title}</span>
                  </div>
                  <span className="recent-status active">Ativo</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>Nenhuma matrícula registrada ainda.</p>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>Dicas Rápidas</h2>
          <div className="tips">
            <div className="tip-item">
              <strong>1. Crie seus módulos:</strong> Vá em "Módulos e Aulas" para montar seus pacotes de curso.
            </div>
            <div className="tip-item">
              <strong>2. Gere cardápios:</strong> Em "Gerar Cardápio", crie links personalizados para seus alunos com os módulos desejados.
            </div>
            <div className="tip-item">
              <strong>3. Receba alunos:</strong> O aluno se cadastra pelo seu link. A liberação de pagamento é manual.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

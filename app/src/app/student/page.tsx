import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { PlayCircle, Lock } from "lucide-react";
import "./student.css";

type EnrollmentWithModule = {
  id: string;
  status: string;
  instrument: string | null;
  module: {
    id: string;
    title: string;
    description: string | null;
    lessons: { id: string }[];
  };
};

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "STUDENT") {
    return null;
  }

  const enrollments: EnrollmentWithModule[] = await prisma.enrollment.findMany({
    where: { studentId: session.user.id },
    include: {
      module: {
        include: {
          lessons: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="student-dashboard">
      <h2 className="section-title">Meus Módulos</h2>
      
      {enrollments.length === 0 ? (
        <div className="empty-state">
          <p>Você ainda não está matriculado em nenhum módulo.</p>
        </div>
      ) : (
        <div className="courses-grid">
          {enrollments.map((enc) => {
            const isLocked = enc.status !== "ACTIVE";
            return (
              <div key={enc.id} className={`course-card ${isLocked ? 'locked' : ''}`}>
                <div className="course-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0 }}>{enc.module.title}</h3>
                    {enc.instrument && (
                      <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
                        🎸 {enc.instrument}
                      </span>
                    )}
                  </div>
                  <p>{enc.module.description || "Acompanhe as aulas deste módulo."}</p>
                  
                  <div className="course-meta">
                    <span>{enc.instrument ? `Curso de ${enc.instrument}` : "Aulas gerais do módulo"}</span>
                  </div>
                </div>

                <div className="course-footer">
                  {isLocked ? (
                    <div className="locked-message">
                      <Lock size={16} /> 
                      {enc.status === "PENDING_PAYMENT" 
                        ? "Aguardando confirmação de pagamento" 
                        : "Acesso bloqueado"}
                    </div>
                  ) : (
                    <Link href={`/student/modules/${enc.module.id}`} className="btn-primary btn-play">
                      <PlayCircle size={18} /> Acessar Aulas
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

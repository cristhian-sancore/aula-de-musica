"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import "./students.css";

type Enrollment = {
  id: string;
  status: string;
  createdAt: string;
  student: {
    id: string;
    name: string;
    email: string;
    whatsapp: string | null;
  };
  module: {
    id: string;
    title: string;
    price: number;
  };
};

export default function StudentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchEnrollments() {
    try {
      const res = await fetch("/api/enrollments");
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data);
      }
    } catch (error) {
      console.error("Erro ao buscar alunos", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    void fetchEnrollments();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/enrollments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchEnrollments();
      } else {
        alert("Erro ao atualizar status");
      }
    } catch (error) {
      console.error("Erro ao atualizar", error);
    }
  };

  return (
    <div className="students-page">
      <div className="page-header">
        <h2>Gestão de Alunos e Matrículas</h2>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : enrollments.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum aluno matriculado ainda.</p>
        </div>
      ) : (
        <div className="enrollments-list">
          {enrollments.map(enc => (
            <div key={enc.id} className={`enrollment-card ${enc.status.toLowerCase()}`}>
              <div className="student-info">
                <h3>{enc.student.name}</h3>
                <span className="contact">{enc.student.email} {enc.student.whatsapp ? `| ${enc.student.whatsapp}` : ""}</span>
                <div className="module-tag">
                  Módulo: <strong>{enc.module.title}</strong> (R$ {enc.module.price.toFixed(2)})
                </div>
                <div className="date-info">
                  <Clock size={14} /> Solicitado em: {new Date(enc.createdAt).toLocaleDateString("pt-BR")}
                </div>
              </div>

              <div className="status-actions">
                <div className={`current-status badge-${enc.status.toLowerCase()}`}>
                  {enc.status === "PENDING_PAYMENT" ? "Aguardando Pagamento" : enc.status === "ACTIVE" ? "Ativo (Liberado)" : "Inativo"}
                </div>
                
                {enc.status === "PENDING_PAYMENT" && (
                  <div className="action-buttons">
                    <button 
                      className="btn-success" 
                      onClick={() => handleUpdateStatus(enc.id, "ACTIVE")}
                      title="Confirmar Pagamento e Liberar Acesso"
                    >
                      <CheckCircle size={18} /> Liberar
                    </button>
                    <button 
                      className="btn-danger" 
                      onClick={() => handleUpdateStatus(enc.id, "INACTIVE")}
                      title="Cancelar Solicitação"
                    >
                      <XCircle size={18} /> Cancelar
                    </button>
                  </div>
                )}

                {enc.status === "ACTIVE" && (
                  <button 
                    className="btn-secondary danger-outline" 
                    onClick={() => handleUpdateStatus(enc.id, "INACTIVE")}
                  >
                    Suspender Acesso
                  </button>
                )}

                {enc.status === "INACTIVE" && (
                  <button 
                    className="btn-secondary" 
                    onClick={() => handleUpdateStatus(enc.id, "ACTIVE")}
                  >
                    Reativar Acesso
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import "./students.css";

type Enrollment = {
  id: string;
  status: string;
  instrument?: string | null;
  paymentMethod?: string | null;
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

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o aluno ${studentName}? Todas as matrículas dele serão apagadas e ele perderá o acesso.`)) return;
    try {
      const res = await fetch(`/api/students/${studentId}`, { method: "DELETE" });
      if (res.ok) {
        fetchEnrollments();
      } else {
        alert("Erro ao excluir aluno");
      }
    } catch (error) {
      console.error("Erro", error);
    }
  };

  const handleResetPassword = async (studentId: string, studentName: string) => {
    const novaSenha = prompt(`Digite a nova senha para o aluno ${studentName} (mínimo 6 caracteres):`, "123456");
    if (!novaSenha) return;
    if (novaSenha.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    
    try {
      const res = await fetch(`/api/students/${studentId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: novaSenha })
      });
      if (res.ok) {
        alert(`Senha do aluno ${studentName} alterada com sucesso! Informe a ele a nova senha: ${novaSenha}`);
      } else {
        alert("Erro ao resetar senha");
      }
    } catch (error) {
      console.error("Erro", error);
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
                {(enc.instrument || enc.paymentMethod) && (
                  <div style={{fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px'}}>
                    {enc.instrument && <span><strong>Instrumento:</strong> {enc.instrument} </span>}
                    {enc.paymentMethod && <span><strong>Pagamento:</strong> {enc.paymentMethod}</span>}
                  </div>
                )}
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

                <div style={{display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px'}}>
                  <button 
                    className="btn-secondary" 
                    style={{flex: 1, fontSize: '0.8rem', padding: '6px'}}
                    onClick={() => handleResetPassword(enc.student.id, enc.student.name)}
                  >
                    🔑 Resetar Senha
                  </button>
                  <button 
                    className="btn-danger" 
                    style={{flex: 1, fontSize: '0.8rem', padding: '6px'}}
                    onClick={() => handleDeleteStudent(enc.student.id, enc.student.name)}
                  >
                    🗑 Excluir Aluno
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

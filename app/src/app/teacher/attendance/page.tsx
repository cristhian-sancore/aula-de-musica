"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, AlertCircle, Trash2, Search, Filter, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./attendance.css";

type ClassSchedule = {
  id: string;
  studentId: string;
  date: string;
  status: string;
  student: {
    id: string;
    name: string;
  };
  attendance?: {
    id: string;
    status: string;
    observation: string | null;
  };
};

export default function AttendancePage() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
  const [status, setStatus] = useState("PRESENT");
  const [observation, setObservation] = useState("");

  // Filtros de Organização
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL | PENDING | PRESENT | ABSENT

  // Paginação (Quebra de Página)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchPendingSchedules = async () => {
    setLoading(true);
    try {
      // Buscar aulas de até 90 dias atrás até 30 dias no futuro
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const end = new Date();
      end.setDate(end.getDate() + 30);
      
      const res = await fetch(`/api/teacher/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      if (res.ok) {
        const data: ClassSchedule[] = await res.json();
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSchedules(data);
      }
    } catch (error) {
      console.error("Erro ao buscar agenda:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSchedules();
  }, []);

  // Voltar para a página 1 quando alterar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, itemsPerPage]);

  const openAttendanceModal = (schedule: ClassSchedule) => {
    setSelectedSchedule(schedule);
    if (schedule.attendance) {
      setStatus(schedule.attendance.status);
      setObservation(schedule.attendance.observation || "");
    } else {
      setStatus("PRESENT");
      setObservation("");
    }
    setShowModal(true);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    try {
      const res = await fetch(`/api/teacher/attendance/${selectedSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, observation })
      });

      if (res.ok) {
        setShowModal(false);
        fetchPendingSchedules();
      } else {
        alert("Erro ao registrar chamada.");
      }
    } catch (error) {
      console.error("Erro", error);
    }
  };

  const handleDeleteSchedule = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;

    try {
      const res = await fetch(`/api/teacher/attendance/${id}`, { method: "DELETE" });
      if (res.ok) {
        setShowModal(false);
        fetchPendingSchedules();
      } else {
        alert("Erro ao excluir aula.");
      }
    } catch (error) {
      console.error("Erro ao excluir", error);
    }
  };

  // Filtragem
  const filteredSchedules = schedules.filter(sch => {
    if (searchTerm && !sch.student?.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterStatus === "PENDING" && sch.attendance) return false;
    if (filterStatus === "PRESENT" && sch.attendance?.status !== "PRESENT") return false;
    if (filterStatus === "ABSENT" && sch.attendance?.status !== "ABSENT" && sch.attendance?.status !== "JUSTIFIED") return false;
    return true;
  });

  // Lógica de Paginação (Quebra de Páginas)
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSchedules = filteredSchedules.slice(startIndex, startIndex + itemsPerPage);

  // GERAÇÃO RÁPIDA DE PDF DO DIÁRIO FILTRADO
  const exportFilteredPDF = async () => {
    const doc = new jsPDF("p", "pt", "a4");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text("DIÁRIO DE CHAMADA E FREQUÊNCIA DE AULAS", 40, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emissão: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}  |  Total de Aulas: ${filteredSchedules.length}`, 40, 70);

    const rows = filteredSchedules.map(sch => {
      let statusText = "Pendente";
      if (sch.attendance?.status === "PRESENT") statusText = "Presente";
      else if (sch.attendance?.status === "ABSENT") statusText = "Faltou";
      else if (sch.attendance?.status === "JUSTIFIED") statusText = "Falta Justificada";

      return [
        format(new Date(sch.date), "dd/MM/yyyy 'às' HH:mm"),
        sch.student?.name || "Desconhecido",
        statusText,
        sch.attendance?.observation || "-"
      ];
    });

    autoTable(doc, {
      startY: 90,
      head: [["Data/Hora da Aula", "Aluno", "Status da Chamada", "Observações"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { top: 90, left: 40, right: 40 }
    });

    doc.save(`Diario_Chamadas_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="attendance-page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2>Diário de Chamada & Frequência</h2>
          <p>Organize, filtre e registre a presença ou falta dos seus alunos nas aulas.</p>
        </div>
        <button 
          type="button" 
          onClick={() => void exportFilteredPDF()} 
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-primary)", color: "#ffffff", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25)" }}
        >
          <Download size={18} /> Baixar PDF Paginado
        </button>
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="attendance-filters">
        <div className="search-box">
          <Search size={18} color="var(--color-text-muted)" />
          <input 
            type="text" 
            placeholder="Buscar por nome do aluno..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <button 
            className={`filter-btn ${filterStatus === "ALL" ? "active" : ""}`}
            onClick={() => setFilterStatus("ALL")}
          >
            Todas ({schedules.length})
          </button>
          <button 
            className={`filter-btn ${filterStatus === "PENDING" ? "active" : ""}`}
            onClick={() => setFilterStatus("PENDING")}
          >
            ⏳ Pendentes ({schedules.filter(s => !s.attendance).length})
          </button>
          <button 
            className={`filter-btn ${filterStatus === "PRESENT" ? "active" : ""}`}
            onClick={() => setFilterStatus("PRESENT")}
          >
            ✅ Presentes ({schedules.filter(s => s.attendance?.status === "PRESENT").length})
          </button>
          <button 
            className={`filter-btn ${filterStatus === "ABSENT" ? "active" : ""}`}
            onClick={() => setFilterStatus("ABSENT")}
          >
            ❌ Faltas ({schedules.filter(s => s.attendance?.status === "ABSENT" || s.attendance?.status === "JUSTIFIED").length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Carregando aulas do diário...</div>
      ) : filteredSchedules.length === 0 ? (
        <div className="empty-state">Nenhuma aula encontrada para o filtro ou busca selecionada.</div>
      ) : (
        <>
          <div className="attendance-list">
            {paginatedSchedules.map(schedule => {
              const hasAttendance = !!schedule.attendance;
              const isPresent = schedule.attendance?.status === "PRESENT";
              
              return (
                <div key={schedule.id} className={`attendance-card ${hasAttendance ? 'completed' : 'pending'}`} onClick={() => openAttendanceModal(schedule)}>
                  <div className="class-info">
                    <h3>{schedule.student?.name}</h3>
                    <div className="class-meta">
                      <span className="date">
                        <Clock size={14} />
                        {format(new Date(schedule.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="attendance-status" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {!hasAttendance ? (
                      <span className="badge pending">Pendente</span>
                    ) : isPresent ? (
                      <span className="badge present"><CheckCircle size={14} /> Presente</span>
                    ) : (
                      <span className="badge absent"><XCircle size={14} /> Falta {schedule.attendance?.status === "JUSTIFIED" ? "(Justificada)" : ""}</span>
                    )}
                    <button 
                      type="button" 
                      onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                      title="Excluir aula"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CONTROLES DE PAGINAÇÃO (QUEBRA DE PÁGINAS) */}
          <div className="pagination-controls">
            <div className="pagination-info">
              Mostrando de <strong>{startIndex + 1}</strong> até <strong>{Math.min(startIndex + itemsPerPage, filteredSchedules.length)}</strong> de <strong>{filteredSchedules.length}</strong> aulas
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                <span>Itens por página:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={e => setItemsPerPage(Number(e.target.value))}
                  style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontWeight: 600 }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="pagination-buttons">
                <button 
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, padding: "0 8px" }}>
                  Página {currentPage} de {totalPages}
                </span>
                <button 
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && selectedSchedule && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Registrar Chamada</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="student-highlight">
              <p><strong>Aluno:</strong> {selectedSchedule.student?.name}</p>
              <p><strong>Data/Hora:</strong> {format(new Date(selectedSchedule.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
            </div>

            <form onSubmit={handleSaveAttendance} className="modal-body">
              <div className="form-group">
                <label>Selecione a Presença</label>
                <div className="status-options">
                  <label className={`status-option ${status === 'PRESENT' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="status" 
                      checked={status === 'PRESENT'} 
                      onChange={() => setStatus('PRESENT')} 
                    />
                    <CheckCircle color="#10b981" size={20} />
                    <span>Presente (Compareceu à aula)</span>
                  </label>

                  <label className={`status-option ${status === 'ABSENT' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="status" 
                      checked={status === 'ABSENT'} 
                      onChange={() => setStatus('ABSENT')} 
                    />
                    <XCircle color="#ef4444" size={20} />
                    <span>Faltou (Sem justificativa)</span>
                  </label>

                  <label className={`status-option ${status === 'JUSTIFIED' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="status" 
                      checked={status === 'JUSTIFIED'} 
                      onChange={() => setStatus('JUSTIFIED')} 
                    />
                    <AlertCircle color="#f59e0b" size={20} />
                    <span>Falta Justificada (+1 Crédito de Reposição)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Observação (Opcional)</label>
                <textarea 
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Ex: Chegou atrasado, aluno teve imprevisto, etc..."
                  rows={3}
                ></textarea>
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <button 
                  type="button" 
                  onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                  style={{ background: "#ef4444", color: "white", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}
                >
                  <Trash2 size={16} /> Excluir Aula
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Salvar Chamada</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

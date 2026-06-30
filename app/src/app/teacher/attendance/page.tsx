"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
  const [status, setStatus] = useState("PRESENT");
  const [observation, setObservation] = useState("");

  const fetchPendingSchedules = async () => {
    setLoading(true);
    try {
      // Get classes from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();
      // add a little buffer to today to include today's classes
      today.setHours(23, 59, 59, 999);
      
      const res = await fetch(`/api/teacher/calendar?startDate=${thirtyDaysAgo.toISOString()}&endDate=${today.toISOString()}`);
      if (res.ok) {
        const data: ClassSchedule[] = await res.json();
        
        // Sort newest first
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

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h2>Chamada (Diário)</h2>
        <p>Aulas recentes. Selecione para marcar presença ou falta.</p>
      </div>

      {loading ? (
        <div className="empty-state">Carregando aulas...</div>
      ) : schedules.length === 0 ? (
        <div className="empty-state">Nenhuma aula encontrada nos últimos 30 dias.</div>
      ) : (
        <div className="attendance-list">
          {schedules.map(schedule => {
            const hasAttendance = !!schedule.attendance;
            const isPresent = schedule.attendance?.status === "PRESENT";
            const isAbsent = schedule.attendance?.status === "ABSENT" || schedule.attendance?.status === "JUSTIFIED_ABSENCE";
            
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
                
                <div className="attendance-status">
                  {!hasAttendance ? (
                    <span className="badge pending">Pendente</span>
                  ) : isPresent ? (
                    <span className="badge present"><CheckCircle size={14} /> Presente</span>
                  ) : (
                    <span className="badge absent"><XCircle size={14} /> Falta {schedule.attendance?.status === "JUSTIFIED_ABSENCE" ? "(Justificada)" : ""}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && selectedSchedule && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Registrar Chamada</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveAttendance} className="modal-body">
              <div className="student-highlight">
                <p><strong>Aluno:</strong> {selectedSchedule.student?.name}</p>
                <p><strong>Data:</strong> {format(new Date(selectedSchedule.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="status-options">
                  <label className={`status-option ${status === "PRESENT" ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="status" 
                      value="PRESENT" 
                      checked={status === "PRESENT"}
                      onChange={(e) => setStatus(e.target.value)}
                    />
                    Presente
                  </label>
                  <label className={`status-option ${status === "ABSENT" ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="status" 
                      value="ABSENT" 
                      checked={status === "ABSENT"}
                      onChange={(e) => setStatus(e.target.value)}
                    />
                    Faltou
                  </label>
                  <label className={`status-option ${status === "JUSTIFIED_ABSENCE" ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="status" 
                      value="JUSTIFIED_ABSENCE" 
                      checked={status === "JUSTIFIED_ABSENCE"}
                      onChange={(e) => setStatus(e.target.value)}
                    />
                    Falta Justificada
                  </label>
                </div>
              </div>
              
              <div className="form-group">
                <label>Observações</label>
                <textarea 
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Ex: Chegou atrasado, aluno teve imprevisto, etc..."
                  rows={3}
                ></textarea>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Chamada</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

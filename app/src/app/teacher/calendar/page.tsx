"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Trash2 } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, subWeeks, addWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "./calendar.css";

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
  };
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);

  // Form states
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      
      const res = await fetch(`/api/teacher/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error("Erro ao buscar agenda:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/teacher/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (error) {
      console.error("Erro ao buscar alunos:", error);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchStudents();
  }, [currentDate]);

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const openNewScheduleModal = (date?: Date) => {
    setSelectedStudent("");
    if (date) {
      setSelectedDate(format(date, 'yyyy-MM-dd'));
      setSelectedTime("14:00");
    } else {
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      setSelectedTime("14:00");
    }
    setShowModal(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedDate || !selectedTime) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      const datetime = new Date(`${selectedDate}T${selectedTime}:00`);
      
      const res = await fetch("/api/teacher/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent,
          date: datetime.toISOString(),
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchSchedules();
      } else {
        alert("Erro ao salvar agendamento.");
      }
    } catch (error) {
      console.error("Erro", error);
    }
  };

  const handleDeleteSchedule = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;

    try {
      const res = await fetch(`/api/teacher/calendar/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSchedules();
      } else {
        alert("Erro ao excluir agendamento.");
      }
    } catch (error) {
      console.error("Erro ao excluir", error);
    }
  };

  const renderWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      const isToday = isSameDay(day, new Date());
      
      const daySchedules = schedules.filter(s => isSameDay(new Date(s.date), day));
      
      days.push(
        <div key={i} className="day-column">
          <div className={`day-header ${isToday ? 'today' : ''}`}>
            <div className="day-name">{format(day, 'EEE', { locale: ptBR })}</div>
            <div className="day-date">{format(day, 'dd/MM')}</div>
          </div>
          
          <div className="day-slots">
            {daySchedules.length > 0 ? (
              daySchedules.map(schedule => (
                <div key={schedule.id} className={`schedule-card ${schedule.attendance ? 'status-completed' : ''}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div className="schedule-time">
                      <Clock size={12} style={{marginRight: 4, display: 'inline'}} />
                      {format(new Date(schedule.date), 'HH:mm')}
                    </div>
                    <div className="schedule-student">
                      {schedule.student?.name}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px", opacity: 0.8 }}
                    title="Excluir agendamento"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-slot" onClick={() => openNewScheduleModal(day)}>
                <Plus size={16} />
              </div>
            )}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="calendar-page">
      <div className="page-header">
        <h2>Agenda e Diário de Classe</h2>
        <button className="btn-primary" onClick={() => openNewScheduleModal()}>
          <Plus size={18} /> Novo Agendamento
        </button>
      </div>

      <div className="calendar-controls">
        <div className="date-nav">
          <button className="btn-icon" onClick={handlePrevWeek}>
            <ChevronLeft size={20} />
          </button>
          <h3>
            {format(startOfWeek(currentDate, { weekStartsOn: 0 }), "dd MMM", { locale: ptBR })} - {format(endOfWeek(currentDate, { weekStartsOn: 0 }), "dd MMM yyyy", { locale: ptBR })}
          </h3>
          <button className="btn-icon" onClick={handleNextWeek}>
            <ChevronRight size={20} />
          </button>
        </div>
        <button className="btn-secondary" onClick={handleToday}>
          <CalendarIcon size={16} /> Hoje
        </button>
      </div>

      {loading ? (
        <div className="empty-state">Carregando agenda...</div>
      ) : (
        <div className="week-grid">
          {renderWeekDays()}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Novo Agendamento</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveSchedule} className="modal-body">
              <div className="form-group">
                <label>Aluno</label>
                <select 
                  value={selectedStudent} 
                  onChange={e => setSelectedStudent(e.target.value)}
                  required
                >
                  <option value="">Selecione o aluno...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>
              
              <div className="form-row" style={{display: 'flex', gap: '16px'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label>Data</label>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="form-group" style={{flex: 1}}>
                  <label>Horário</label>
                  <input 
                    type="time" 
                    value={selectedTime}
                    onChange={e => setSelectedTime(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Agendamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileText, Users, DollarSign, CalendarCheck, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import "./reports.css";

type StudentReport = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  createdAt: string;
  enrollments: {
    id: string;
    status: string;
    instrument: string | null;
    paymentMethod: string | null;
    installments: number | null;
    dayOfWeek: number | null;
    classTime: string | null;
    horario: string | null;
    replacementCredits: number;
    module: {
      title: string;
      price: number;
    };
  }[];
};

type InvoiceReport = {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  month: number;
  year: number;
  student: {
    name: string;
    whatsapp: string | null;
  };
};

type ScheduleReport = {
  id: string;
  date: string;
  status: string;
  student: {
    name: string;
  };
  attendance?: {
    status: string;
    observation: string | null;
  };
};

const DAYS_OF_WEEK = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"students" | "financial" | "attendance">("students");
  const [loading, setLoading] = useState(true);
  
  const [platformName, setPlatformName] = useState("Aula de Música 2.0");
  const [teacherName, setTeacherName] = useState("Professor");
  const [students, setStudents] = useState<StudentReport[]>([]);
  const [invoices, setInvoices] = useState<InvoiceReport[]>([]);
  const [schedules, setSchedules] = useState<ScheduleReport[]>([]);

  // Filtros
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    async function fetchReportsData() {
      try {
        const res = await fetch("/api/teacher/reports");
        if (res.ok) {
          const data = await res.json();
          setPlatformName(data.platformName || "Aula de Música 2.0");
          setTeacherName(data.teacherName || "Professor");
          setStudents(data.students || []);
          setInvoices(data.invoices || []);
          setSchedules(data.schedules || []);
        }
      } catch (error) {
        console.error("Erro ao buscar dados de relatórios:", error);
      } finally {
        setLoading(false);
      }
    }
    void fetchReportsData();
  }, []);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatHorario = (enc: StudentReport["enrollments"][0]) => {
    if (enc.dayOfWeek !== null && enc.classTime) {
      return `${DAYS_OF_WEEK[enc.dayOfWeek]} às ${enc.classTime}`;
    }
    return enc.horario || "Não definido";
  };

  // ================= GERAÇÃO DE PDF =================

  const generateStudentsPDF = () => {
    const doc = new jsPDF("p", "pt", "a4");

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(platformName.toUpperCase(), 40, 50);

    doc.setFontSize(14);
    doc.setTextColor(218, 123, 26);
    doc.text("RELATÓRIO GERAL DE ALUNOS E MATRÍCULAS", 40, 72);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Professor(a): ${teacherName}  |  Emissão: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 40, 90);

    const filteredStudents = students.filter(s => {
      if (statusFilter === "ALL") return true;
      return s.enrollments.some(e => e.status === statusFilter);
    });

    const rows = filteredStudents.flatMap(s => {
      if (s.enrollments.length === 0) {
        return [[s.name, s.whatsapp || "-", "-", "-", "-", "Sem Matrícula"]];
      }
      return s.enrollments.map(e => [
        s.name,
        s.whatsapp || "-",
        e.instrument || "-",
        e.module.title,
        formatHorario(e),
        e.status === "ACTIVE" ? "Ativo" : "Pendente"
      ]);
    });

    autoTable(doc, {
      startY: 110,
      head: [["Nome do Aluno", "WhatsApp", "Instrumento", "Módulo / Plano", "Horário / Aula", "Status"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [218, 123, 26], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { top: 110, left: 40, right: 40 }
    });

    doc.save(`Relatorio_Alunos_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const generateFinancialPDF = () => {
    const doc = new jsPDF("p", "pt", "a4");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(platformName.toUpperCase(), 40, 50);

    doc.setFontSize(14);
    doc.setTextColor(218, 123, 26);
    doc.text("RELATÓRIO FINANCEIRO - CONTAS A RECEBER", 40, 72);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emissão: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 40, 90);

    const filteredInvoices = invoices.filter(inv => {
      if (statusFilter === "ALL") return true;
      return inv.status === statusFilter;
    });

    const totalPaid = filteredInvoices.filter(i => i.status === "PAID").reduce((acc, i) => acc + i.amount, 0);
    const totalPending = filteredInvoices.filter(i => i.status === "PENDING" || i.status === "OVERDUE").reduce((acc, i) => acc + i.amount, 0);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text(`Total Recebido: ${formatCurrency(totalPaid)}`, 40, 110);
    doc.setTextColor(245, 158, 11);
    doc.text(`Total Pendente: ${formatCurrency(totalPending)}`, 240, 110);

    const rows = filteredInvoices.map(inv => [
      inv.student.name,
      `${inv.month.toString().padStart(2, "0")}/${inv.year}`,
      format(new Date(inv.dueDate), "dd/MM/yyyy"),
      formatCurrency(inv.amount),
      inv.status === "PAID" ? "PAGO" : inv.status === "OVERDUE" ? "ATRASADO" : "PENDENTE",
      inv.paidAt ? format(new Date(inv.paidAt), "dd/MM/yyyy") : "-"
    ]);

    autoTable(doc, {
      startY: 125,
      head: [["Aluno", "Referência", "Vencimento", "Valor", "Status", "Data Pagto"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { top: 125, left: 40, right: 40 }
    });

    doc.save(`Relatorio_Financeiro_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const generateAttendancePDF = () => {
    const doc = new jsPDF("p", "pt", "a4");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(platformName.toUpperCase(), 40, 50);

    doc.setFontSize(14);
    doc.setTextColor(218, 123, 26);
    doc.text("RELATÓRIO DE DIÁRIO DE CHAMADA E FREQUÊNCIA", 40, 72);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emissão: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 40, 90);

    const rows = schedules.map(sch => {
      let statusText = "Pendente";
      if (sch.attendance?.status === "PRESENT") statusText = "Presente";
      else if (sch.attendance?.status === "ABSENT") statusText = "Faltou";
      else if (sch.attendance?.status === "JUSTIFIED") statusText = "Falta Justificada";

      return [
        format(new Date(sch.date), "dd/MM/yyyy 'às' HH:mm"),
        sch.student.name,
        statusText,
        sch.attendance?.observation || "-"
      ];
    });

    autoTable(doc, {
      startY: 110,
      head: [["Data/Hora da Aula", "Aluno", "Status da Chamada", "Observações"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { top: 110, left: 40, right: 40 }
    });

    doc.save(`Relatorio_Chamada_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (loading) return <div className="empty-state">Carregando dados para relatórios...</div>;

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h2>Central de Relatórios & PDF</h2>
          <p>Exporte relatórios consolidados e audite os dados da sua escola.</p>
        </div>
      </div>

      <div className="reports-tabs">
        <button 
          className={`report-tab-btn ${activeTab === "students" ? "active" : ""}`}
          onClick={() => { setActiveTab("students"); setStatusFilter("ALL"); }}
        >
          <Users size={18} /> Alunos e Matrículas
        </button>
        <button 
          className={`report-tab-btn ${activeTab === "financial" ? "active" : ""}`}
          onClick={() => { setActiveTab("financial"); setStatusFilter("ALL"); }}
        >
          <DollarSign size={18} /> Financeiro
        </button>
        <button 
          className={`report-tab-btn ${activeTab === "attendance" ? "active" : ""}`}
          onClick={() => { setActiveTab("attendance"); setStatusFilter("ALL"); }}
        >
          <CalendarCheck size={18} /> Diário de Frequência
        </button>
      </div>

      {activeTab === "students" && (
        <div className="report-card animate-fade-in">
          <div className="report-card-header">
            <div className="report-card-title">
              <h3>Relatório de Alunos Matriculados</h3>
              <p>Total de {students.length} alunos cadastrados na sua escola.</p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)" }}
              >
                <option value="ALL">Todos os Status</option>
                <option value="ACTIVE">Apenas Ativos</option>
                <option value="PENDING_PAYMENT">Apenas Pendentes</option>
              </select>
              <button className="btn-pdf" onClick={generateStudentsPDF}>
                <Download size={18} /> Baixar Relatório em PDF
              </button>
            </div>
          </div>

          <div className="reports-table-container">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>WhatsApp</th>
                  <th>Instrumento</th>
                  <th>Plano / Módulo</th>
                  <th>Horário Presencial</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  if (s.enrollments.length === 0) {
                    return (
                      <tr key={s.id}>
                        <td><strong>{s.name}</strong></td>
                        <td>{s.whatsapp || "-"}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td><span className="status-badge pending">Sem Matrícula</span></td>
                      </tr>
                    );
                  }
                  return s.enrollments
                    .filter(e => statusFilter === "ALL" || e.status === statusFilter)
                    .map(enc => (
                      <tr key={enc.id}>
                        <td><strong>{s.name}</strong></td>
                        <td>{s.whatsapp || "-"}</td>
                        <td>{enc.instrument || "-"}</td>
                        <td>{enc.module.title}</td>
                        <td>{formatHorario(enc)}</td>
                        <td>
                          <span className={`status-badge ${enc.status === "ACTIVE" ? "active" : "pending"}`}>
                            {enc.status === "ACTIVE" ? "Ativo" : "Pendente"}
                          </span>
                        </td>
                      </tr>
                    ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "financial" && (
        <div className="report-card animate-fade-in">
          <div className="report-card-header">
            <div className="report-card-title">
              <h3>Relatório de Contas a Receber</h3>
              <p>Confira as faturas geradas, pagamentos efetuados e pendências.</p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)" }}
              >
                <option value="ALL">Todas as Faturas</option>
                <option value="PAID">Pagas</option>
                <option value="PENDING">Pendentes</option>
                <option value="OVERDUE">Atrasadas</option>
              </select>
              <button className="btn-pdf" onClick={generateFinancialPDF}>
                <Download size={18} /> Baixar Financeiro em PDF
              </button>
            </div>
          </div>

          <div className="report-stats">
            <div className="stat-box success">
              <span>Total Recebido</span>
              <strong>
                {formatCurrency(invoices.filter(i => i.status === "PAID").reduce((a, b) => a + b.amount, 0))}
              </strong>
            </div>
            <div className="stat-box warning">
              <span>Total Pendente</span>
              <strong>
                {formatCurrency(invoices.filter(i => i.status === "PENDING").reduce((a, b) => a + b.amount, 0))}
              </strong>
            </div>
            <div className="stat-box danger">
              <span>Total em Atraso</span>
              <strong>
                {formatCurrency(invoices.filter(i => i.status === "OVERDUE").reduce((a, b) => a + b.amount, 0))}
              </strong>
            </div>
          </div>

          <div className="reports-table-container">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Mês/Ano</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data Baixa</th>
                </tr>
              </thead>
              <tbody>
                {invoices
                  .filter(inv => statusFilter === "ALL" || inv.status === statusFilter)
                  .map(inv => (
                    <tr key={inv.id}>
                      <td><strong>{inv.student.name}</strong></td>
                      <td>{inv.month.toString().padStart(2, "0")}/{inv.year}</td>
                      <td>{format(new Date(inv.dueDate), "dd/MM/yyyy")}</td>
                      <td><strong>{formatCurrency(inv.amount)}</strong></td>
                      <td>
                        <span className={`status-badge ${inv.status === "PAID" ? "active" : inv.status === "OVERDUE" ? "overdue" : "pending"}`}>
                          {inv.status === "PAID" ? "PAGO" : inv.status === "OVERDUE" ? "ATRASADO" : "PENDENTE"}
                        </span>
                      </td>
                      <td>{inv.paidAt ? format(new Date(inv.paidAt), "dd/MM/yyyy") : "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="report-card animate-fade-in">
          <div className="report-card-header">
            <div className="report-card-title">
              <h3>Relatório do Diário de Chamada</h3>
              <p>Histórico recente de aulas agendadas e chamadas realizadas.</p>
            </div>
            <button className="btn-pdf" onClick={generateAttendancePDF}>
              <Download size={18} /> Baixar Frequência em PDF
            </button>
          </div>

          <div className="reports-table-container">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Aluno</th>
                  <th>Status da Chamada</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(sch => (
                  <tr key={sch.id}>
                    <td>{format(new Date(sch.date), "dd/MM/yyyy 'às' HH:mm")}</td>
                    <td><strong>{sch.student.name}</strong></td>
                    <td>
                      <span className={`status-badge ${sch.attendance?.status === "PRESENT" ? "active" : sch.attendance?.status ? "overdue" : "pending"}`}>
                        {sch.attendance?.status === "PRESENT" ? "Presente" : sch.attendance?.status === "ABSENT" ? "Faltou" : sch.attendance?.status === "JUSTIFIED" ? "Justificado" : "Pendente"}
                      </span>
                    </td>
                    <td>{sch.attendance?.observation || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

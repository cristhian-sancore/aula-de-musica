"use client";

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileText, Users, DollarSign, CalendarCheck, Download, Filter, RotateCcw } from "lucide-react";
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
  studentId: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  month: number;
  year: number;
  student: {
    id: string;
    name: string;
    whatsapp: string | null;
  };
};

type ScheduleReport = {
  id: string;
  studentId: string;
  date: string;
  status: string;
  student: {
    id: string;
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
  const [teacherImage, setTeacherImage] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentReport[]>([]);
  const [invoices, setInvoices] = useState<InvoiceReport[]>([]);
  const [schedules, setSchedules] = useState<ScheduleReport[]>([]);

  // Filtros Avançados
  const [selectedStudentId, setSelectedStudentId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function fetchReportsData() {
      try {
        const res = await fetch("/api/teacher/reports");
        if (res.ok) {
          const data = await res.json();
          setPlatformName(data.platformName || "Aula de Música 2.0");
          setTeacherName(data.teacherName || "Professor");
          setTeacherImage(data.teacherImage || null);
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

  const resetFilters = () => {
    setSelectedStudentId("ALL");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatHorario = (enc: StudentReport["enrollments"][0]) => {
    if (enc.dayOfWeek !== null && enc.classTime) {
      return `${DAYS_OF_WEEK[enc.dayOfWeek]} às ${enc.classTime}`;
    }
    return enc.horario || "Não definido";
  };

  // ================= DADOS FILTRADOS =================
  const filteredStudents = students.filter(s => {
    if (selectedStudentId !== "ALL" && s.id !== selectedStudentId) return false;
    if (statusFilter !== "ALL" && !s.enrollments.some(e => e.status === statusFilter)) return false;
    return true;
  });

  const filteredInvoices = invoices.filter(inv => {
    if (selectedStudentId !== "ALL" && inv.studentId !== selectedStudentId && inv.student.id !== selectedStudentId) return false;
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (startDate && new Date(inv.dueDate) < new Date(`${startDate}T00:00:00`)) return false;
    if (endDate && new Date(inv.dueDate) > new Date(`${endDate}T23:59:59`)) return false;
    return true;
  });

  const filteredSchedules = schedules.filter(sch => {
    if (selectedStudentId !== "ALL" && sch.studentId !== selectedStudentId && sch.student.id !== selectedStudentId) return false;
    if (startDate && new Date(sch.date) < new Date(`${startDate}T00:00:00`)) return false;
    if (endDate && new Date(sch.date) > new Date(`${endDate}T23:59:59`)) return false;
    return true;
  });

  // ================= GERAÇÃO DE LOGO =================
  const getLogoBase64 = async (): Promise<string | null> => {
    if (teacherImage && teacherImage.startsWith("data:image")) {
      return teacherImage;
    }
    try {
      const url = teacherImage || "/logo.png";
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const addLogoToDoc = async (doc: jsPDF) => {
    const logoData = await getLogoBase64();
    if (logoData) {
      try {
        const formatImg = logoData.includes("png") ? "PNG" : "JPEG";
        doc.addImage(logoData, formatImg, 460, 25, 75, 75);
      } catch (e) {
        console.error("Erro ao desenhar logo no PDF:", e);
      }
    }
  };

  const getFilterSummaryText = () => {
    const parts = [];
    if (selectedStudentId !== "ALL") {
      const st = students.find(s => s.id === selectedStudentId);
      if (st) parts.push(`Aluno: ${st.name}`);
    }
    if (startDate && endDate) {
      parts.push(`Período: ${format(new Date(startDate), "dd/MM/yyyy")} a ${format(new Date(endDate), "dd/MM/yyyy")}`);
    } else if (startDate) {
      parts.push(`A partir de: ${format(new Date(startDate), "dd/MM/yyyy")}`);
    } else if (endDate) {
      parts.push(`Até: ${format(new Date(endDate), "dd/MM/yyyy")}`);
    }
    return parts.join("  |  ");
  };

  // ================= GERAÇÃO DE PDF =================

  const generateStudentsPDF = async () => {
    const doc = new jsPDF("p", "pt", "a4");

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
    const filterInfo = getFilterSummaryText();
    doc.text(`Emissão: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}${filterInfo ? `  |  ${filterInfo}` : ""}`, 40, 90);

    await addLogoToDoc(doc);

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
      startY: 115,
      head: [["Nome do Aluno", "WhatsApp", "Instrumento", "Plano / Módulo", "Horário Presencial", "Status"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [218, 123, 26], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { top: 115, left: 40, right: 40 }
    });

    doc.save(`Relatorio_Alunos_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const generateFinancialPDF = async () => {
    const doc = new jsPDF("p", "pt", "a4");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(platformName.toUpperCase(), 40, 50);

    doc.setFontSize(14);
    doc.setTextColor(218, 123, 26);
    doc.text("RELATÓRIO FINANCEIRO E EXTRATO", 40, 72);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const filterInfo = getFilterSummaryText();
    doc.text(`Emissão: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}${filterInfo ? `  |  ${filterInfo}` : ""}`, 40, 90);

    await addLogoToDoc(doc);

    const totalPaid = filteredInvoices.filter(i => i.status === "PAID").reduce((acc, i) => acc + i.amount, 0);
    const totalPending = filteredInvoices.filter(i => i.status === "PENDING" || i.status === "OVERDUE").reduce((acc, i) => acc + i.amount, 0);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text(`Total Recebido: ${formatCurrency(totalPaid)}`, 40, 115);
    doc.setTextColor(245, 158, 11);
    doc.text(`Total Pendente: ${formatCurrency(totalPending)}`, 240, 115);

    const rows = filteredInvoices.map(inv => [
      inv.student.name,
      `${inv.month.toString().padStart(2, "0")}/${inv.year}`,
      format(new Date(inv.dueDate), "dd/MM/yyyy"),
      formatCurrency(inv.amount),
      inv.status === "PAID" ? "PAGO" : inv.status === "OVERDUE" ? "ATRASADO" : "PENDENTE",
      inv.paidAt ? format(new Date(inv.paidAt), "dd/MM/yyyy") : "-"
    ]);

    autoTable(doc, {
      startY: 130,
      head: [["Aluno", "Referência", "Vencimento", "Valor", "Status", "Data Pagto"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { top: 130, left: 40, right: 40 }
    });

    doc.save(`Relatorio_Financeiro_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const generateAttendancePDF = async () => {
    const doc = new jsPDF("p", "pt", "a4");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(platformName.toUpperCase(), 40, 50);

    doc.setFontSize(14);
    doc.setTextColor(218, 123, 26);
    doc.text("BOLETIM DE FREQUÊNCIA E DIÁRIO DE CHAMADA", 40, 72);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const filterInfo = getFilterSummaryText();
    doc.text(`Emissão: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}${filterInfo ? `  |  ${filterInfo}` : ""}`, 40, 90);

    await addLogoToDoc(doc);

    const rows = filteredSchedules.map(sch => {
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
      startY: 115,
      head: [["Data/Hora da Aula", "Aluno", "Status da Chamada", "Observações"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { top: 115, left: 40, right: 40 }
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

      {/* BARRA DE FILTROS GERAIS (ALUNO + PERÍODO) */}
      <div className="report-card animate-fade-in" style={{ padding: "16px 20px", marginBottom: "8px", background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Filtrar por Aluno:</label>
            <select 
              value={selectedStudentId} 
              onChange={e => setSelectedStudentId(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", minWidth: "220px", fontWeight: 600 }}
            >
              <option value="ALL">👤 Todos os Alunos ({students.length})</option>
              {students.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          {activeTab !== "students" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Data Inicial:</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Data Final:</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Status:</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)", fontWeight: 600 }}
            >
              <option value="ALL">Todos os Status</option>
              {activeTab === "students" && (
                <>
                  <option value="ACTIVE">Ativos</option>
                  <option value="PENDING_PAYMENT">Pendentes</option>
                </>
              )}
              {activeTab === "financial" && (
                <>
                  <option value="PAID">Pagas</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="OVERDUE">Atrasadas</option>
                </>
              )}
            </select>
          </div>
        </div>

        {(selectedStudentId !== "ALL" || statusFilter !== "ALL" || startDate || endDate) && (
          <button 
            type="button" 
            onClick={resetFilters}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid var(--color-border)", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.85rem" }}
          >
            <RotateCcw size={14} /> Limpar Filtros
          </button>
        )}
      </div>

      {activeTab === "students" && (
        <div className="report-card animate-fade-in">
          <div className="report-card-header">
            <div className="report-card-title">
              <h3>Relatório de Alunos Matriculados</h3>
              <p>Mostrando {filteredStudents.length} de {students.length} alunos.</p>
            </div>
            <button className="btn-pdf" onClick={() => void generateStudentsPDF()}>
              <Download size={18} /> Baixar Relatório em PDF
            </button>
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
                {filteredStudents.map(s => {
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
              <h3>Relatório e Extrato Financeiro</h3>
              <p>Mostrando {filteredInvoices.length} faturas encontradas no período selecionado.</p>
            </div>
            <button className="btn-pdf" onClick={() => void generateFinancialPDF()}>
              <Download size={18} /> Baixar Extrato em PDF
            </button>
          </div>

          <div className="report-stats">
            <div className="stat-box success">
              <span>Total Recebido</span>
              <strong>
                {formatCurrency(filteredInvoices.filter(i => i.status === "PAID").reduce((a, b) => a + b.amount, 0))}
              </strong>
            </div>
            <div className="stat-box warning">
              <span>Total Pendente</span>
              <strong>
                {formatCurrency(filteredInvoices.filter(i => i.status === "PENDING").reduce((a, b) => a + b.amount, 0))}
              </strong>
            </div>
            <div className="stat-box danger">
              <span>Total em Atraso</span>
              <strong>
                {formatCurrency(filteredInvoices.filter(i => i.status === "OVERDUE").reduce((a, b) => a + b.amount, 0))}
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
                {filteredInvoices.map(inv => (
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
              <h3>Boletim do Diário de Chamada</h3>
              <p>Mostrando {filteredSchedules.length} aulas encontradas para os filtros.</p>
            </div>
            <button className="btn-pdf" onClick={() => void generateAttendancePDF()}>
              <Download size={18} /> Baixar Boletim em PDF
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
                {filteredSchedules.map(sch => (
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

"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle, XCircle, Clock, AlertCircle, Trash2 } from "lucide-react";
import "./invoices.css";

type Invoice = {
  id: string;
  amount: number;
  dueDate: string;
  month: number;
  year: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  paidAt: string | null;
  student: {
    id: string;
    name: string;
    email: string;
  };
};

type Student = {
  id: string;
  name: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentDate = new Date();
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    studentId: "",
    amount: "",
    dueDate: "",
    month: filterMonth,
    year: filterYear
  });

  async function fetchInvoices() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/invoices?month=${filterMonth}&year=${filterYear}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error("Erro ao buscar faturas:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudents() {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (error) {
      console.error("Erro ao buscar alunos:", error);
    }
  }

  useEffect(() => {
    fetchInvoices();
    fetchStudents();
  }, [filterMonth, filterYear]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/teacher/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchInvoices();
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta mensalidade?")) return;
    try {
      const res = await fetch(`/api/teacher/invoices/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchInvoices();
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teacher/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInvoice)
      });
      if (res.ok) {
        setShowModal(false);
        fetchInvoices();
      }
    } catch (error) {
      console.error("Erro ao criar fatura:", error);
    }
  };

  const totalExpected = invoices.filter(i => i.status !== "CANCELED").reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaid = invoices.filter(i => i.status === "PAID").reduce((acc, curr) => acc + curr.amount, 0);
  const totalPending = invoices.filter(i => i.status === "PENDING" || i.status === "OVERDUE").reduce((acc, curr) => acc + curr.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID": return <span className="status-badge paid"><CheckCircle size={14}/> Pago</span>;
      case "PENDING": return <span className="status-badge pending"><Clock size={14}/> Pendente</span>;
      case "OVERDUE": return <span className="status-badge overdue"><AlertCircle size={14}/> Atrasado</span>;
      case "CANCELED": return <span className="status-badge canceled"><XCircle size={14}/> Cancelado</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="invoices-page">
      <div className="page-header">
        <h2>Financeiro (Mensalidades)</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nova Mensalidade
        </button>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <span className="summary-title">Total Previsto</span>
          <span className="summary-value">R$ {totalExpected.toFixed(2)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-title">Total Recebido</span>
          <span className="summary-value success">R$ {totalPaid.toFixed(2)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-title">A Receber</span>
          <span className="summary-value warning">R$ {totalPending.toFixed(2)}</span>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Mês</label>
          <select 
            className="input-field" 
            value={filterMonth} 
            onChange={e => setFilterMonth(parseInt(e.target.value))}
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Ano</label>
          <select 
            className="input-field" 
            value={filterYear} 
            onChange={e => setFilterYear(parseInt(e.target.value))}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="invoices-table-container">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th style={{textAlign: 'right'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)'}}>
                    Nenhuma mensalidade encontrada para este período.
                  </td>
                </tr>
              ) : (
                invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.student.name}</strong><br/>
                      <span style={{fontSize: '0.8rem', color: 'var(--color-text-muted)'}}>{invoice.student.email}</span>
                    </td>
                    <td>{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td>R$ {invoice.amount.toFixed(2)}</td>
                    <td>{getStatusBadge(invoice.status)}</td>
                    <td style={{textAlign: 'right'}}>
                      <div className="actions-cell" style={{justifyContent: 'flex-end'}}>
                        {invoice.status !== "PAID" && (
                          <button className="btn-icon-small success" title="Marcar como Pago" onClick={() => handleUpdateStatus(invoice.id, "PAID")}>
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {invoice.status === "PAID" && (
                          <button className="btn-icon-small warning" title="Marcar como Pendente" onClick={() => handleUpdateStatus(invoice.id, "PENDING")}>
                            <Clock size={18} />
                          </button>
                        )}
                        <button className="btn-icon-small danger" title="Excluir" onClick={() => handleDelete(invoice.id)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Nova Mensalidade</h3>
            <form onSubmit={handleCreate} style={{display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px'}}>
              <div className="form-group">
                <label>Aluno</label>
                <select className="input-field" required value={newInvoice.studentId} onChange={e => setNewInvoice({...newInvoice, studentId: e.target.value})}>
                  <option value="">Selecione um aluno</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Valor (R$)</label>
                <input type="number" step="0.01" required className="input-field" value={newInvoice.amount} onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Data de Vencimento</label>
                <input type="date" required className="input-field" value={newInvoice.dueDate} onChange={e => setNewInvoice({...newInvoice, dueDate: e.target.value})} />
              </div>

              <div style={{display: 'flex', gap: '16px'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label>Mês Referência</label>
                  <select className="input-field" value={newInvoice.month} onChange={e => setNewInvoice({...newInvoice, month: parseInt(e.target.value)})}>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label>Ano Referência</label>
                  <select className="input-field" value={newInvoice.year} onChange={e => setNewInvoice({...newInvoice, year: parseInt(e.target.value)})}>
                    {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{marginTop: '24px'}}>
                <button type="button" className="btn-text" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const currentYear = new Date().getFullYear();

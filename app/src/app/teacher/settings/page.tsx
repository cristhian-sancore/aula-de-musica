"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Percent, Music, CreditCard } from "lucide-react";
import "./settings.css";

type TeacherSettings = {
  cardTaxRate: number;
  enrollmentFee: number;
  defaultInstruments: string[];
  defaultPaymentMethods: string[];
  platformName: string;
  availableSlots: { day: number, time: string, endTime?: string, capacity: number }[] | null;
};

const DAYS_OF_WEEK = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TeacherSettings>({
    cardTaxRate: 0,
    enrollmentFee: 90.00,
    defaultInstruments: [],
    defaultPaymentMethods: [],
    platformName: "Aula de Música",
    availableSlots: null,
  });

  // String representations for the inputs
  const [instrumentsInput, setInstrumentsInput] = useState("");
  const [paymentsInput, setPaymentsInput] = useState("");
  const [taxInput, setTaxInput] = useState("0");
  const [feeInput, setFeeInput] = useState("90.00");
  const [platformNameInput, setPlatformNameInput] = useState("Aula de Música");
  
  // Availability state
  const [slots, setSlots] = useState<{ day: number, time: string, endTime?: string, capacity: number }[]>([]);
  const [newSlotDay, setNewSlotDay] = useState(1);
  const [newSlotTime, setNewSlotTime] = useState("14:00");
  const [newSlotEndTime, setNewSlotEndTime] = useState("15:00");
  const [newSlotCapacity, setNewSlotCapacity] = useState(1);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/teacher/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setInstrumentsInput((data.defaultInstruments || []).join(", "));
        setPaymentsInput((data.defaultPaymentMethods || []).join(", "));
        setTaxInput(data.cardTaxRate ? data.cardTaxRate.toString() : "0");
        setFeeInput(data.enrollmentFee !== undefined && data.enrollmentFee !== null ? data.enrollmentFee.toFixed(2) : "90.00");
        setPlatformNameInput(data.platformName || "Aula de Música");
        setSlots(data.availableSlots || []);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const parsedTax = parseFloat(taxInput.replace(",", "."));
      const finalTax = isNaN(parsedTax) ? 0 : parsedTax;

      const parsedFee = parseFloat(feeInput.replace(",", "."));
      const finalFee = isNaN(parsedFee) ? 90.00 : parsedFee;

      const instrumentsList = instrumentsInput.split(',').map(s => s.trim()).filter(Boolean);
      const paymentsList = paymentsInput.split(',').map(s => s.trim()).filter(Boolean);

      const res = await fetch("/api/teacher/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardTaxRate: finalTax,
          enrollmentFee: finalFee,
          defaultInstruments: instrumentsList,
          defaultPaymentMethods: paymentsList,
          platformName: platformNameInput,
          availableSlots: slots,
        }),
      });

      if (res.ok) {
        alert("Configurações salvas com sucesso!");
        fetchSettings(); // Refresh from DB
      } else {
        alert("Erro ao salvar configurações.");
      }
    } catch (error) {
      console.error("Erro ao salvar configurações", error);
      alert("Erro interno.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Carregando configurações...</p>;
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>Configurações Globais</h2>
      </div>

      <div className="settings-container">
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-section">
            <div className="section-header">
              <Settings className="section-icon" />
              <div>
                <h3>Geral</h3>
                <p>Configurações básicas da sua plataforma.</p>
              </div>
            </div>
            <div className="form-group">
              <label>Nome do Site (Aba do Navegador):</label>
              <input 
                type="text" 
                className="input-field" 
                value={platformNameInput}
                onChange={(e) => setPlatformNameInput(e.target.value)}
                placeholder="Ex: Aula de Música"
              />
              <small className="help-text">Este nome aparecerá na aba do navegador e nos links compartilhados.</small>
            </div>
          </div>

          <div className="settings-section">
            <div className="section-header">
              <Percent className="section-icon" />
              <div>
                <h3>Taxas de Cartão de Crédito</h3>
                <p>Repasse a taxa da operadora para parcelamentos acima de 3 vezes (4x a 12x).</p>
              </div>
            </div>
            <div className="form-group">
              <label>Acrescentar Taxa (%) no valor Total da matrícula:</label>
              <div className="input-with-icon">
                <input 
                  type="text" 
                  className="input-field" 
                  value={taxInput}
                  onChange={(e) => setTaxInput(e.target.value)}
                  placeholder="Ex: 5.5"
                />
                <span className="input-suffix">%</span>
              </div>
              <small className="help-text">Coloque 0 se não quiser repassar juros. Essa taxa será somada ao valor total quando o aluno escolher 4x ou mais no cartão.</small>
            </div>

            <div className="form-group" style={{ marginTop: '24px' }}>
              <label>Valor da Taxa de Matrícula (R$):</label>
              <div className="input-with-icon">
                <span className="input-prefix">R$</span>
                <input 
                  type="text" 
                  className="input-field" 
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  placeholder="Ex: 90.00"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <small className="help-text">Coloque 0 caso você não cobre taxa de matrícula. Este valor será exibido na página de pagamento do convite.</small>
            </div>
          </div>

          <div className="settings-section">
            <div className="section-header">
              <Music className="section-icon" />
              <div>
                <h3>Cursos & Instrumentos</h3>
                <p>Lista padrão que aparecerá pré-preenchida ao criar um novo link.</p>
              </div>
            </div>
            <div className="form-group">
              <label>Quais cursos você oferece? (Separe por vírgula)</label>
              <textarea 
                className="input-field" 
                rows={3}
                value={instrumentsInput}
                onChange={(e) => setInstrumentsInput(e.target.value)}
                placeholder="Ex: Violão, Teclado, Bateria"
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="section-header">
              <CreditCard className="section-icon" />
              <div>
                <h3>Formas de Pagamento</h3>
                <p>Lista padrão que aparecerá pré-preenchida ao criar um novo link.</p>
              </div>
            </div>
            <div className="form-group">
              <label>Quais formas de pagamento você aceita? (Separe por vírgula)</label>
              <textarea 
                className="input-field" 
                rows={2}
                value={paymentsInput}
                onChange={(e) => setPaymentsInput(e.target.value)}
                placeholder="Ex: Cartão de Crédito, PIX, Boleto"
              />
            </div>
          </div>

          {/* NOVOS HORÁRIOS */}
          <div className="settings-section">
            <div className="section-header">
              <Settings className="section-icon" />
              <div>
                <h3>Disponibilidade de Horários</h3>
                <p>Configure os dias e horários em que você tem vaga para receber novos alunos.</p>
              </div>
            </div>

            <div className="availability-form" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                <label>Dia da Semana</label>
                <select className="input-field" value={newSlotDay} onChange={e => setNewSlotDay(Number(e.target.value))}>
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <option key={idx} value={idx}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
                <label>Início</label>
                <input type="time" className="input-field" value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
                <label>Fim</label>
                <input type="time" className="input-field" value={newSlotEndTime} onChange={e => setNewSlotEndTime(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
                <label>Vagas Totais</label>
                <input type="number" min="1" className="input-field" value={newSlotCapacity} onChange={e => setNewSlotCapacity(Number(e.target.value))} />
              </div>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ height: '42px' }}
                onClick={() => {
                  if (newSlotTime && newSlotEndTime) {
                    setSlots(prev => [...prev, { day: newSlotDay, time: newSlotTime, endTime: newSlotEndTime, capacity: newSlotCapacity }]);
                  }
                }}
              >
                Adicionar Horário
              </button>
            </div>

            <div className="slots-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {slots.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Nenhum horário cadastrado. Os alunos poderão digitar qualquer horário livremente no cadastro.</p>
              ) : (
                slots.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)).map((slot, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div>
                      <strong>{DAYS_OF_WEEK[slot.day]}</strong> das {slot.time} às {slot.endTime || '?'} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginLeft: '8px' }}>(Capacidade: {slot.capacity} vagas)</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSlots(prev => prev.filter((_, i) => i !== index))}
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="form-actions" style={{ justifyContent: "flex-end", marginTop: '24px' }}>
            <button type="submit" className="btn-primary btn-large" disabled={saving}>
              {saving ? "Salvando..." : (
                <>
                  <Save size={20} /> Salvar Configurações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Percent, Music, CreditCard } from "lucide-react";
import "./settings.css";

type TeacherSettings = {
  cardTaxRate: number;
  defaultInstruments: string[];
  defaultPaymentMethods: string[];
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TeacherSettings>({
    cardTaxRate: 0,
    defaultInstruments: [],
    defaultPaymentMethods: [],
  });

  // String representations for the inputs
  const [instrumentsInput, setInstrumentsInput] = useState("");
  const [paymentsInput, setPaymentsInput] = useState("");
  const [taxInput, setTaxInput] = useState("0");

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

      const instrumentsList = instrumentsInput.split(',').map(s => s.trim()).filter(Boolean);
      const paymentsList = paymentsInput.split(',').map(s => s.trim()).filter(Boolean);

      const res = await fetch("/api/teacher/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardTaxRate: finalTax,
          defaultInstruments: instrumentsList,
          defaultPaymentMethods: paymentsList,
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
                placeholder="Ex: PIX, Cartão de Crédito"
              />
            </div>
          </div>

          <div className="form-actions">
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

"use client";

import { useState, useEffect } from "react";
import "./profile.css";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setName(data.name || "");
          setWhatsapp(data.whatsapp || "");
        }
      } catch (error) {
        console.error("Erro", error);
      } finally {
        setLoading(false);
      }
    }
    void fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp, newPassword })
      });

      if (res.ok) {
        setMessage({ text: "Perfil atualizado com sucesso!", type: "success" });
        setNewPassword(""); // Clear password field
      } else {
        const err = await res.json();
        setMessage({ text: err.error || "Erro ao atualizar perfil", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erro de conexão", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="profile-page">
      <h2>Minha Conta</h2>
      <p className="subtitle">Mantenha seus dados de contato e acesso atualizados.</p>

      <div className="card profile-card">
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Nome Completo</label>
            <input 
              required
              type="text" 
              className="input-field" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>WhatsApp</label>
            <input 
              type="tel" 
              className="input-field" 
              value={whatsapp} 
              onChange={e => setWhatsapp(e.target.value)} 
            />
          </div>

          <hr className="divider" />

          <div className="form-group">
            <label>Nova Senha (opcional)</label>
            <input 
              type="password" 
              className="input-field" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Digite apenas se quiser alterar"
              minLength={6}
            />
          </div>

          {message.text && (
            <div className={`message-alert ${message.type}`}>
              {message.text}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </form>
      </div>
    </div>
  );
}

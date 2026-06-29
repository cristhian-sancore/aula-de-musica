"use client";

import { useState, useEffect, useRef } from "react";
import { User, Mail, Phone, Lock, Camera, Save } from "lucide-react";
import "./profile.css";
import { useRouter } from "next/navigation";

export default function TeacherProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [image, setImage] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || "");
        setWhatsapp(data.whatsapp || "");
        setImage(data.image || "");
      }
    } catch (error) {
      console.error("Erro ao buscar perfil", error);
    } finally {
      setLoading(false);
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem não pode ter mais de 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: any = { name, email, whatsapp, image };
      if (newPassword) payload.newPassword = newPassword;

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Perfil atualizado com sucesso! Faça login novamente para atualizar sua foto na barra lateral se tiver modificado.");
        setNewPassword("");
        router.refresh(); 
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao salvar o perfil.");
      }
    } catch (error) {
      console.error("Erro", error);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Carregando perfil...</p>;

  return (
    <div className="profile-page">
      <div className="page-header">
        <h2>Meu Perfil</h2>
        <p className="subtitle">Gerencie suas informações pessoais e credenciais de acesso.</p>
      </div>

      <div className="card profile-card">
        <form onSubmit={handleSave} className="profile-form">
          <div className="avatar-section">
            <div className="avatar-preview">
              {image ? (
                <img src={image} alt="Avatar" />
              ) : (
                <div className="avatar-placeholder">{name?.[0] || "P"}</div>
              )}
              <button 
                type="button" 
                className="avatar-change-btn" 
                onClick={() => fileInputRef.current?.click()}
                title="Trocar Imagem"
              >
                <Camera size={18} />
              </button>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                style={{ display: "none" }} 
              />
            </div>
            <div className="avatar-instructions">
              <strong>Foto de Perfil</strong>
              <p>Recomendado: formato quadrado (JPG ou PNG). Max 2MB.</p>
              {image && (
                <button type="button" className="btn-text" onClick={() => setImage("")} style={{color: '#ef4444', padding: '0', marginTop: '8px'}}>
                  Remover Foto
                </button>
              )}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label><User size={16} /> Nome Completo</label>
              <input 
                required
                className="input-field" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Seu nome"
              />
            </div>

            <div className="form-group">
              <label><Phone size={16} /> Contato (WhatsApp)</label>
              <input 
                className="input-field" 
                value={whatsapp} 
                onChange={e => setWhatsapp(e.target.value)} 
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="form-group">
              <label><Mail size={16} /> E-mail de Acesso</label>
              <input 
                type="email"
                required
                className="input-field" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="form-group">
              <label><Lock size={16} /> Nova Senha (Opcional)</label>
              <input 
                type="password"
                className="input-field" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder="Digite para alterar"
                minLength={6}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Salvando..." : <><Save size={18} style={{marginRight: '8px', display: 'inline'}} /> Salvar Alterações</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

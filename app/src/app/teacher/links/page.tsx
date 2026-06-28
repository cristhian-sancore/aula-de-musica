"use client";

import { useState, useEffect } from "react";
import { Link as LinkIcon, Plus, Copy, ExternalLink } from "lucide-react";
import "./links.css";

type Module = {
  id: string;
  title: string;
  price: number;
};

type CustomLink = {
  id: string;
  token: string;
  studentName?: string;
  status: string;
  createdAt: string;
  modules: { module: Module }[];
};

export default function LinksPage() {
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form states
  const [studentName, setStudentName] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  async function fetchLinks() {
    try {
      const res = await fetch("/api/links");
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (error) {
      console.error("Erro ao buscar links", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableModules() {
    try {
      const res = await fetch("/api/modules");
      if (res.ok) {
        const data = await res.json();
        setAvailableModules(data);
      }
    } catch (error) {
      console.error("Erro ao buscar módulos disponíveis", error);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    void fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    void fetchAvailableModules();
  }, []);

  const handleToggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      setSelectedModules(selectedModules.filter(m => m !== id));
    } else {
      setSelectedModules([...selectedModules, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedModules.length === 0) {
      alert("Selecione pelo menos um módulo para compor o cardápio.");
      return;
    }

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, moduleIds: selectedModules }),
      });

      if (res.ok) {
        setShowModal(false);
        setStudentName("");
        setSelectedModules([]);
        fetchLinks();
      } else {
        alert("Erro ao gerar link");
      }
    } catch (error) {
      console.error("Erro ao gerar link", error);
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    alert("Link copiado para a área de transferência!");
  };

  return (
    <div className="links-page">
      <div className="page-header">
        <h2>Gerador de Cardápios (Links Personalizados)</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Novo Link
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : links.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum link gerado ainda. Crie um novo link para matricular alunos.</p>
        </div>
      ) : (
        <div className="links-list">
          {links.map(link => (
            <div key={link.id} className="link-card">
              <div className="link-header">
                <div className="link-info">
                  <h3>Para: {link.studentName || "Aluno não identificado"}</h3>
                  <span className="link-date">
                    Criado em: {new Date(link.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <span className={`status-badge ${link.status.toLowerCase()}`}>
                  {link.status === "ACTIVE" ? "Ativo" : link.status}
                </span>
              </div>

              <div className="link-modules">
                <strong>Módulos inclusos no cardápio:</strong>
                <ul>
                  {link.modules.map(m => (
                    <li key={m.module.id}>&bull; {m.module.title} (R$ {m.module.price.toFixed(2)})</li>
                  ))}
                </ul>
              </div>

              <div className="link-actions">
                <div className="link-url-display">
                  <LinkIcon size={16} />
                  <span>.../invite/{link.token.substring(0, 8)}...</span>
                </div>
                <div className="action-buttons">
                  <button className="btn-secondary" onClick={() => copyToClipboard(link.token)}>
                    <Copy size={16} /> Copiar Link
                  </button>
                  <a href={`/invite/${link.token}`} target="_blank" rel="noreferrer" className="btn-icon">
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Gerar Novo Cardápio</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              Selecione os módulos que deseja oferecer e crie um link exclusivo.
            </p>

            <form onSubmit={handleSubmit} className="link-form">
              <div className="form-group">
                <label>Nome do Aluno (Referência para você)</label>
                <input 
                  className="input-field" 
                  value={studentName} 
                  onChange={e => setStudentName(e.target.value)} 
                  placeholder="Ex: João Silva"
                />
              </div>

              <div className="form-group">
                <label>Selecione os Módulos Disponíveis</label>
                <div className="modules-selection">
                  {availableModules.length === 0 ? (
                    <p>Nenhum módulo cadastrado. Cadastre um módulo primeiro.</p>
                  ) : (
                    availableModules.map(mod => (
                      <label key={mod.id} className={`module-checkbox-card ${selectedModules.includes(mod.id) ? 'selected' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedModules.includes(mod.id)}
                          onChange={() => handleToggleModule(mod.id)}
                          style={{ display: 'none' }}
                        />
                        <div className="checkbox-content">
                          <span className="mod-title">{mod.title}</span>
                          <span className="mod-price">R$ {mod.price.toFixed(2)}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-text" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Gerar Link</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Video, DollarSign } from "lucide-react";
import "./modules.css";

type VideoLesson = {
  id?: string;
  title: string;
  videoUrl: string;
  order: number;
};

type Module = {
  id: string;
  title: string;
  description: string;
  price: number;
  isMonthly?: boolean;
  lessons: VideoLesson[];
};

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isMonthly, setIsMonthly] = useState(false);
  const [lessons, setLessons] = useState<VideoLesson[]>([]);

  async function fetchModules() {
    try {
      const res = await fetch("/api/modules");
      if (res.ok) {
        const data = await res.json();
        setModules(data);
      }
    } catch (error) {
      console.error("Erro ao buscar módulos", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    void fetchModules();
  }, []);

  const openModal = (mod: Module | null = null) => {
    setEditingModule(mod);
    if (mod) {
      setTitle(mod.title);
      setDescription(mod.description || "");
      setPrice(mod.price.toString());
      setIsMonthly(mod.isMonthly || false);
      setLessons(mod.lessons || []);
    } else {
      setTitle("");
      setDescription("");
      setPrice("");
      setIsMonthly(false);
      setLessons([]);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingModule(null);
  };

  const handleAddLesson = () => {
    setLessons([...lessons, { title: "", videoUrl: "", order: lessons.length }]);
  };

  const handleLessonChange = (index: number, field: string, value: string) => {
    const updated = [...lessons];
    updated[index] = { ...updated[index], [field]: value };
    setLessons(updated);
  };

  const handleRemoveLesson = (index: number) => {
    const updated = lessons.filter((_, i) => i !== index);
    setLessons(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title,
      description,
      price: parseFloat(price),
      isMonthly,
      lessons,
    };

    try {
      const url = editingModule ? `/api/modules/${editingModule.id}` : "/api/modules";
      const method = editingModule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        closeModal();
        fetchModules();
      } else {
        alert("Erro ao salvar módulo");
      }
    } catch (error) {
      console.error("Erro ao salvar módulo", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este módulo?")) {
      try {
        const res = await fetch(`/api/modules/${id}`, { method: "DELETE" });
        if (res.ok) {
          fetchModules();
        }
      } catch (error) {
        console.error("Erro ao deletar", error);
      }
    }
  };

  return (
    <div className="modules-page">
      <div className="page-header">
        <h2>Meus Módulos de Aula</h2>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Novo Módulo
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : modules.length === 0 ? (
        <div className="empty-state">
          <p>Você ainda não criou nenhum módulo.</p>
        </div>
      ) : (
        <div className="modules-grid">
          {modules.map(mod => (
            <div key={mod.id} className="module-card">
              <div className="module-header">
                <h3>{mod.title}</h3>
                <span className="price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.9rem' }}>
                  <span><DollarSign size={14} style={{display: 'inline', verticalAlign: 'middle'}}/> {mod.price.toFixed(2)}</span>
                  {mod.isMonthly && <span style={{fontSize: '0.75rem', opacity: 0.8}}>Plano Mensal</span>}
                </span>
              </div>
              <p className="description">{mod.description || "Sem descrição"}</p>
              
              <div className="lessons-info">
                <Video size={16} />
                <span>{mod.lessons?.length || 0} aulas em vídeo</span>
              </div>

              <div className="actions">
                <button className="btn-icon" onClick={() => openModal(mod)}>
                  <Edit2 size={18} />
                </button>
                <button className="btn-icon danger" onClick={() => handleDelete(mod.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingModule ? "Editar Módulo" : "Novo Módulo"}</h3>
            <form onSubmit={handleSubmit} className="module-form">
              <div className="form-group">
                <label>Título do Módulo</label>
                <input required className="input-field" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              
              <div className="form-group" style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label>Preço (R$)</label>
                  <input required type="number" step="0.01" className="input-field" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={isMonthly} 
                      onChange={e => setIsMonthly(e.target.checked)} 
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>Este é um Plano Mensal (esconde parcelamento de 12x)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea className="input-field" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div className="lessons-section">
                <div className="lessons-header">
                  <h4>Aulas (Vídeos do YouTube)</h4>
                  <button type="button" className="btn-secondary" onClick={handleAddLesson}>
                    <Plus size={16} /> Adicionar Aula
                  </button>
                </div>
                
                {lessons.map((lesson, idx) => (
                  <div key={idx} className="lesson-item">
                    <div className="lesson-inputs">
                      <input 
                        required 
                        className="input-field" 
                        placeholder="Título da Aula" 
                        value={lesson.title} 
                        onChange={e => handleLessonChange(idx, "title", e.target.value)} 
                      />
                      <input 
                        required 
                        className="input-field" 
                        placeholder="Link do YouTube (ID ou URL)" 
                        value={lesson.videoUrl} 
                        onChange={e => handleLessonChange(idx, "videoUrl", e.target.value)} 
                      />
                    </div>
                    <button type="button" className="btn-icon danger" onClick={() => handleRemoveLesson(idx)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-text" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Módulo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

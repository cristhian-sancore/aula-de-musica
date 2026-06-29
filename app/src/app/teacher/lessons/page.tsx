"use client";

import { useState, useEffect } from "react";
import { Music, Plus, Trash2, Edit, Video, FolderOpen, X } from "lucide-react";
import "./lessons.css";

type VideoLesson = {
  id: string;
  title: string;
  videoUrl: string;
  order: number;
  instrument?: string;
  chapter?: string;
};

const DEFAULT_INSTRUMENTS = ["Violão", "Teclado", "Guitarra", "Baixo", "Bateria", "Canto"];
const DEFAULT_CHAPTERS = ["Introdução", "Básico 1", "Básico 2", "Avançado 1"];

export default function InstrumentLessonsPage() {
  const [instruments, setInstruments] = useState<string[]>(DEFAULT_INSTRUMENTS);
  const [selectedInstrument, setSelectedInstrument] = useState<string>("Violão");
  const [chapters, setChapters] = useState<string[]>(DEFAULT_CHAPTERS);
  
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [currentChapter, setCurrentChapter] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonUrl, setLessonUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add Chapter/Instrument state
  const [newChapterName, setNewChapterName] = useState("");
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newInstrumentName, setNewInstrumentName] = useState("");
  const [showAddInstrument, setShowAddInstrument] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, [selectedInstrument]);

  async function fetchLessons() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/lessons?instrument=${encodeURIComponent(selectedInstrument)}`);
      if (res.ok) {
        const data = await res.json();
        setLessons(data);
        
        // Se houver capítulos que não estão na lista DEFAULT, adicioná-los
        const existingChapters = Array.from(new Set(data.map((l: VideoLesson) => l.chapter).filter(Boolean))) as string[];
        const mergedChapters = Array.from(new Set([...DEFAULT_CHAPTERS, ...existingChapters]));
        setChapters(mergedChapters);
      }
    } catch (error) {
      console.error("Erro ao carregar aulas", error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (chapter: string, lesson?: VideoLesson) => {
    setCurrentChapter(chapter);
    if (lesson) {
      setEditingId(lesson.id);
      setLessonTitle(lesson.title);
      setLessonUrl(lesson.videoUrl);
    } else {
      setEditingId(null);
      setLessonTitle("");
      setLessonUrl("");
    }
    setShowModal(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !lessonUrl.trim()) return;

    try {
      if (editingId) {
        const res = await fetch(`/api/teacher/lessons/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: lessonTitle,
            videoUrl: lessonUrl,
          }),
        });
        if (res.ok) fetchLessons();
      } else {
        const res = await fetch("/api/teacher/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: lessonTitle,
            videoUrl: lessonUrl,
            instrument: selectedInstrument,
            chapter: currentChapter,
          }),
        });
        if (res.ok) fetchLessons();
      }
      setShowModal(false);
    } catch (error) {
      console.error("Erro ao salvar aula", error);
      alert("Erro ao salvar aula.");
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;
    try {
      const res = await fetch(`/api/teacher/lessons/${id}`, { method: "DELETE" });
      if (res.ok) fetchLessons();
    } catch (error) {
      console.error("Erro ao excluir", error);
    }
  };

  const handleAddCustomChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterName.trim()) return;
    if (!chapters.includes(newChapterName.trim())) {
      setChapters([...chapters, newChapterName.trim()]);
    }
    setNewChapterName("");
    setShowAddChapter(false);
  };

  const handleAddCustomInstrument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstrumentName.trim()) return;
    if (!instruments.includes(newInstrumentName.trim())) {
      setInstruments([...instruments, newInstrumentName.trim()]);
      setSelectedInstrument(newInstrumentName.trim());
    }
    setNewInstrumentName("");
    setShowAddInstrument(false);
  };

  return (
    <div className="lessons-management">
      <div className="lessons-header-bar">
        <h1>Aulas por Instrumento</h1>
        <p>Cadastre os vídeos de cada capítulo (Introdução, Básico, Avançado...) conforme o instrumento escolhido pelo aluno.</p>
      </div>

      {/* Seletor de Instrumentos */}
      <div className="instruments-tabs">
        {instruments.map((inst) => (
          <button
            key={inst}
            className={`instrument-tab ${selectedInstrument === inst ? "active" : ""}`}
            onClick={() => setSelectedInstrument(inst)}
          >
            <Music size={18} />
            {inst}
          </button>
        ))}
        
        {showAddInstrument ? (
          <form onSubmit={handleAddCustomInstrument} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Nome do instrumento..."
              value={newInstrumentName}
              onChange={(e) => setNewInstrumentName(e.target.value)}
              className="input-field"
              style={{ padding: "6px 12px", width: "160px" }}
              autoFocus
            />
            <button type="submit" className="btn-primary" style={{ padding: "6px 12px" }}>Add</button>
            <button type="button" className="btn-icon" onClick={() => setShowAddInstrument(false)}><X size={18} /></button>
          </form>
        ) : (
          <button className="instrument-tab" onClick={() => setShowAddInstrument(true)} style={{ borderStyle: "dashed" }}>
            <Plus size={18} /> Novo Instrumento
          </button>
        )}
      </div>

      {loading ? (
        <p>Carregando aulas do instrumento {selectedInstrument}...</p>
      ) : (
        <div className="chapters-list">
          {chapters.map((chapter) => {
            const chapterLessons = lessons.filter((l) => l.chapter === chapter);
            return (
              <div key={chapter} className="chapter-box">
                <div className="chapter-header">
                  <h3>
                    <FolderOpen size={22} style={{ color: "var(--color-primary)" }} />
                    {chapter}
                  </h3>
                  <button
                    className="btn-primary"
                    style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                    onClick={() => handleOpenModal(chapter)}
                  >
                    <Plus size={16} /> Adicionar Aula
                  </button>
                </div>

                {chapterLessons.length === 0 ? (
                  <div className="empty-chapter">
                    Nenhuma aula cadastrada neste capítulo para {selectedInstrument}. Clique em &quot;Adicionar Aula&quot; acima.
                  </div>
                ) : (
                  <div className="chapter-lessons">
                    {chapterLessons.map((lesson, index) => (
                      <div key={lesson.id} className="lesson-item">
                        <div className="lesson-info">
                          <span className="lesson-number">{index + 1}</span>
                          <div>
                            <span className="lesson-title">{lesson.title}</span>
                            <span className="lesson-url">{lesson.videoUrl}</span>
                          </div>
                        </div>
                        <div className="lesson-actions">
                          <button className="btn-icon" onClick={() => handleOpenModal(chapter, lesson)} title="Editar">
                            <Edit size={18} />
                          </button>
                          <button className="btn-icon delete" onClick={() => handleDeleteLesson(lesson.id)} title="Excluir">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Botão para adicionar novo capítulo customizado */}
          {showAddChapter ? (
            <form onSubmit={handleAddCustomChapter} className="chapter-box" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Nome do novo capítulo (Ex: Básico 3, Repertório...)"
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                className="input-field"
                autoFocus
              />
              <button type="submit" className="btn-primary" style={{ whiteSpace: "nowrap" }}>Criar Capítulo</button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddChapter(false)}>Cancelar</button>
            </form>
          ) : (
            <button
              className="btn-secondary"
              style={{ padding: "16px", borderStyle: "dashed", justifyContent: "center", width: "100%", marginTop: "8px" }}
              onClick={() => setShowAddChapter(true)}
            >
              <Plus size={20} /> Adicionar Outro Capítulo
            </button>
          )}
        </div>
      )}

      {/* Modal de Cadastro/Edição de Aula */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingId ? "Editar Aula" : "Nova Aula"} - {currentChapter}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={22} /></button>
            </div>
            <form onSubmit={handleSaveLesson}>
              <div className="form-group">
                <label>Título da Aula</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Aula 1 - Conhecendo o instrumento"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Link ou ID do YouTube</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ ou dQw4w9WgXcQ"
                  value={lessonUrl}
                  onChange={(e) => setLessonUrl(e.target.value)}
                  required
                />
                <small style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: "4px", display: "block" }}>
                  Você pode colar a URL completa do YouTube ou apenas o código do vídeo.
                </small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Aula</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

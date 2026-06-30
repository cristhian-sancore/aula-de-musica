"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PlayCircle, MessageCircle, Send } from "lucide-react";
import "./player.css";

type Lesson = {
  id: string;
  title: string;
  videoUrl: string;
  order: number;
  chapter?: string;
};

type LessonMessage = {
  id: string;
  content: string;
  reply: string | null;
  createdAt: string;
};

type ModuleData = {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  completedLessonIds?: string[];
  studentInstrument?: string;
};

export default function ModulePlayerPage() {
  const params = useParams();
  const router = useRouter();
  
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [completing, setCompleting] = useState(false);
  const [messages, setMessages] = useState<LessonMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  async function fetchModuleData(moduleId: string) {
    try {
      const res = await fetch(`/api/modules/${moduleId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Sorting lessons by order
        const sortedLessons = data.lessons.sort((a: Lesson, b: Lesson) => a.order - b.order);
        data.lessons = sortedLessons;

        setModuleData(data);
        if (data.completedLessonIds) {
          setCompletedLessons(data.completedLessonIds);
        }

        if (sortedLessons.length > 0) {
          // Find the first lesson that is not completed to be the current lesson
          // Or the last one if all are completed
          let nextLesson = sortedLessons[0];
          if (data.completedLessonIds && data.completedLessonIds.length > 0) {
            const firstUncompleted = sortedLessons.find((l: Lesson) => !data.completedLessonIds.includes(l.id));
            if (firstUncompleted) {
              nextLesson = firstUncompleted;
            } else {
              nextLesson = sortedLessons[sortedLessons.length - 1];
            }
          }
          setCurrentLesson(nextLesson);
        }
      } else {
        setError("Não foi possível carregar o módulo.");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(lessonId: string) {
    try {
      const res = await fetch(`/api/messages?lessonId=${lessonId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (params.id) {
      void fetchModuleData(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    if (currentLesson) {
      void fetchMessages(currentLesson.id);
    }
  }, [currentLesson]);

  const extractYouTubeId = (url: string) => {
    // Basic extraction
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  };

  const handleToggleComplete = async (lessonId: string, isCurrentlyCompleted: boolean) => {
    setCompleting(true);
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, completed: !isCurrentlyCompleted })
      });
      if (res.ok) {
        if (isCurrentlyCompleted) {
          setCompletedLessons(prev => prev.filter(id => id !== lessonId));
        } else {
          setCompletedLessons(prev => [...prev, lessonId]);
          
          // Auto-advance to next lesson if available
          const currentIndex = moduleData?.lessons.findIndex(l => l.id === lessonId) ?? -1;
          if (moduleData && currentIndex !== -1 && currentIndex < moduleData.lessons.length - 1) {
            setCurrentLesson(moduleData.lessons[currentIndex + 1]);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentLesson) return;
    
    setSendingMessage(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: currentLesson.id, content: newMessage })
      });
      if (res.ok) {
        setNewMessage("");
        void fetchMessages(currentLesson.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) return <div className="loading-state">Carregando módulo...</div>;
  if (error || !moduleData) return <div className="error-state">{error}</div>;

  return (
    <div className="player-layout">
      <div className="player-header">
        <button className="btn-text back-btn" onClick={() => router.push("/student")}>
          <ArrowLeft size={20} /> Voltar aos Cursos
        </button>
        <h2 className="module-title">{moduleData.title}</h2>
      </div>

      <div className="player-content">
        <div className="video-section">
          <div className="video-container" style={{ position: 'relative' }}>
            <div className="yt-overlay-top"></div>
            {currentLesson ? (
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(currentLesson.videoUrl)}?modestbranding=1&rel=0&showinfo=0`}
                title={currentLesson.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="no-video">Nenhuma aula cadastrada neste módulo.</div>
            )}
            <div className="yt-overlay-bottom"></div>
          </div>
          
          {currentLesson && (
            <div className="current-lesson-info">
              <div className="current-lesson-header">
                <div>
                  <h3>{currentLesson.title}</h3>
                </div>
                <button 
                  className={`btn-complete ${completedLessons.includes(currentLesson.id) ? 'completed' : ''}`}
                  onClick={() => handleToggleComplete(currentLesson.id, completedLessons.includes(currentLesson.id))}
                  disabled={completing}
                >
                  {completedLessons.includes(currentLesson.id) ? "✓ Aula Concluída" : "Marcar como Concluída"}
                </button>
              </div>
            </div>
          )}

          {currentLesson && (
            <div className="messages-section">
              <div className="messages-header">
                <MessageCircle size={20} />
                <h3>Tira-Dúvidas</h3>
              </div>
              
              <form onSubmit={handleSendMessage} className="message-form">
                <input
                  type="text"
                  placeholder="Escreva sua dúvida sobre esta aula..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="input-field"
                  disabled={sendingMessage}
                />
                <button type="submit" className="btn-primary" disabled={sendingMessage || !newMessage.trim()}>
                  <Send size={16} /> Enviar
                </button>
              </form>

              <div className="messages-list">
                {messages.length === 0 ? (
                  <p className="no-messages">Você ainda não enviou nenhuma dúvida nesta aula.</p>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className="message-card">
                      <div className="message-student">
                        <span className="msg-label">Sua Dúvida</span>
                        <p>{msg.content}</p>
                      </div>
                      {msg.reply && (
                        <div className="message-teacher">
                          <span className="msg-label">Resposta do Professor</span>
                          <p>{msg.reply}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="playlist-section">
          <div className="playlist-header">
            <h3>{moduleData.studentInstrument ? `Aulas de ${moduleData.studentInstrument}` : "Conteúdo do Módulo"}</h3>
            <span>{moduleData.lessons.length} aulas</span>
          </div>
          
          <div className="playlist-chapters" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
            {(() => {
              const chaptersOrder = ["Introdução", "Básico 1", "Básico 2", "Avançado 1"];
              const allChapters = Array.from(new Set(moduleData.lessons.map(l => l.chapter || "Geral")));
              
              // Sort chapters based on chaptersOrder first, then alphabetically
              allChapters.sort((a, b) => {
                const idxA = chaptersOrder.indexOf(a);
                const idxB = chaptersOrder.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
              });

              return allChapters.map(chap => {
                const chapLessons = moduleData.lessons.filter(l => (l.chapter || "Geral") === chap);
                if (chapLessons.length === 0) return null;

                return (
                  <div key={chap} className="playlist-chapter-group">
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--color-primary)', marginBottom: '8px', paddingLeft: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📁 {chap}
                    </h4>
                    <ul className="playlist" style={{ gap: '6px' }}>
                      {chapLessons.map(lesson => {
                        const idx = moduleData.lessons.findIndex(l => l.id === lesson.id);
                        const isCompleted = completedLessons.includes(lesson.id);
                        const isLocked = idx > 0 && !completedLessons.includes(moduleData.lessons[idx - 1].id);
                        const isActive = currentLesson?.id === lesson.id;

                        return (
                          <li 
                            key={lesson.id}
                            className={`playlist-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
                            onClick={() => {
                              if (!isLocked) setCurrentLesson(lesson);
                            }}
                            style={{ borderRadius: '8px' }}
                          >
                            <div className="item-number">
                              {isCompleted ? "✓" : (isLocked ? "🔒" : idx + 1)}
                            </div>
                            <div className="item-details">
                              <span className="item-title">{lesson.title}</span>
                              {isActive && (
                                <span className="item-playing">Reproduzindo...</span>
                              )}
                            </div>
                            {!isLocked && <PlayCircle size={18} className="play-icon" />}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

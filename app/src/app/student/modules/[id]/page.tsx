"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PlayCircle } from "lucide-react";
import "./player.css";

type Lesson = {
  id: string;
  title: string;
  videoUrl: string;
  order: number;
};

type ModuleData = {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  completedLessonIds?: string[]; // Added this to store completed lessons
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
            // @ts-ignore - data.completedLessonIds type check
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

  useEffect(() => {
    if (params.id) {
      // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
      void fetchModuleData(params.id as string);
    }
  }, [params.id]);

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
          <div className="video-container">
            {currentLesson ? (
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(currentLesson.videoUrl)}`}
                title={currentLesson.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="no-video">Nenhuma aula cadastrada neste módulo.</div>
            )}
          </div>
          
          {currentLesson && (
            <div className="current-lesson-info">
              <div className="current-lesson-header">
                <div>
                  <h3>{currentLesson.title}</h3>
                  <p>{moduleData.description}</p>
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
        </div>

        <div className="playlist-section">
          <div className="playlist-header">
            <h3>Conteúdo do Módulo</h3>
            <span>{moduleData.lessons.length} aulas</span>
          </div>
          
          <ul className="playlist">
            {moduleData.lessons.map((lesson, idx) => {
              const isCompleted = completedLessons.includes(lesson.id);
              // A lesson is locked if the PREVIOUS lesson exists and is NOT completed
              const isLocked = idx > 0 && !completedLessons.includes(moduleData.lessons[idx - 1].id);
              const isActive = currentLesson?.id === lesson.id;

              return (
                <li 
                  key={lesson.id}
                  className={`playlist-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => {
                    if (!isLocked) setCurrentLesson(lesson);
                  }}
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
      </div>
    </div>
  );
}

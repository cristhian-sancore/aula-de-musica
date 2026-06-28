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
};

export default function ModulePlayerPage() {
  const params = useParams();
  const router = useRouter();
  
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchModuleData(moduleId: string) {
    try {
      const res = await fetch(`/api/modules/${moduleId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Sorting lessons by order
        const sortedLessons = data.lessons.sort((a: Lesson, b: Lesson) => a.order - b.order);
        data.lessons = sortedLessons;

        setModuleData(data);
        if (sortedLessons.length > 0) {
          setCurrentLesson(sortedLessons[0]);
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
              <h3>{currentLesson.title}</h3>
              <p>{moduleData.description}</p>
            </div>
          )}
        </div>

        <div className="playlist-section">
          <div className="playlist-header">
            <h3>Conteúdo do Módulo</h3>
            <span>{moduleData.lessons.length} aulas</span>
          </div>
          
          <ul className="playlist">
            {moduleData.lessons.map((lesson, idx) => (
              <li 
                key={lesson.id}
                className={`playlist-item ${currentLesson?.id === lesson.id ? 'active' : ''}`}
                onClick={() => setCurrentLesson(lesson)}
              >
                <div className="item-number">{idx + 1}</div>
                <div className="item-details">
                  <span className="item-title">{lesson.title}</span>
                  {currentLesson?.id === lesson.id && (
                    <span className="item-playing">Reproduzindo...</span>
                  )}
                </div>
                <PlayCircle size={18} className="play-icon" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Reply, CheckCircle } from "lucide-react";
import "./messages.css";

type LessonMessage = {
  id: string;
  content: string;
  reply: string | null;
  createdAt: string;
  student: { name: string; email: string };
  lesson: { title: string; module: { title: string } };
};

export default function TeacherMessagesPage() {
  const [messages, setMessages] = useState<LessonMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PENDING">("PENDING");

  async function fetchMessages() {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchMessages();
  }, []);

  const handleReply = async (messageId: string) => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    
    try {
      const res = await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, reply: replyContent })
      });
      
      if (res.ok) {
        setReplyingTo(null);
        setReplyContent("");
        void fetchMessages();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === "PENDING") return !msg.reply;
    return true;
  });

  if (loading) return <div className="page-layout">Carregando mensagens...</div>;

  return (
    <div className="page-layout">
      <div className="page-header">
        <div>
          <h1>Tira-Dúvidas</h1>
          <p>Responda as dúvidas dos alunos nas aulas.</p>
        </div>
      </div>

      <div className="filter-tabs">
        <button 
          className={`tab-btn ${filter === "PENDING" ? "active" : ""}`}
          onClick={() => setFilter("PENDING")}
        >
          Aguardando Resposta
        </button>
        <button 
          className={`tab-btn ${filter === "ALL" ? "active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          Todas as Dúvidas
        </button>
      </div>

      <div className="messages-grid">
        {filteredMessages.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} className="empty-icon" />
            <p>Tudo tranquilo por aqui! Nenhuma dúvida pendente.</p>
          </div>
        ) : (
          filteredMessages.map(msg => (
            <div key={msg.id} className="message-card-admin">
              <div className="msg-header">
                <div className="student-info">
                  <strong>{msg.student.name}</strong>
                  <span>{msg.student.email}</span>
                </div>
                <div className="lesson-info">
                  <span className="badge">{msg.lesson.module.title}</span>
                  <span className="lesson-name">{msg.lesson.title}</span>
                </div>
              </div>
              
              <div className="msg-content">
                <p>{msg.content}</p>
                <span className="msg-date">{new Date(msg.createdAt).toLocaleString('pt-BR')}</span>
              </div>

              {msg.reply ? (
                <div className="msg-reply-done">
                  <strong>Sua Resposta:</strong>
                  <p>{msg.reply}</p>
                </div>
              ) : (
                <div className="msg-reply-action">
                  {replyingTo === msg.id ? (
                    <div className="reply-form">
                      <textarea 
                        className="input-field" 
                        rows={3} 
                        placeholder="Digite sua resposta..."
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
                        autoFocus
                      />
                      <div className="reply-actions">
                        <button className="btn-text" onClick={() => setReplyingTo(null)}>Cancelar</button>
                        <button 
                          className="btn-primary" 
                          onClick={() => handleReply(msg.id)}
                          disabled={submitting || !replyContent.trim()}
                        >
                          Enviar Resposta
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-secondary" onClick={() => setReplyingTo(msg.id)}>
                      <Reply size={16} /> Responder
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

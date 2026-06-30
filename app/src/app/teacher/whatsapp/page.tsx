"use client";

import { useState, useEffect } from "react";
import { MessageCircle, QrCode, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import "./whatsapp.css";

export default function WhatsAppConfigPage() {
  const [status, setStatus] = useState<string>("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/whatsapp");
      if (!res.ok) throw new Error("Falha ao buscar status");
      
      const data = await res.json();
      setStatus(data.status);
      if (data.qr) {
        setQrCode(data.qr);
      } else {
        setQrCode(null);
      }
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Polling a cada 5 segundos se estiver conectando para atualizar o QR ou pegar o status de conectado
    const interval = setInterval(() => {
      if (status === "connecting" || status === "uninitialized") {
        fetchStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status]);

  const handleGenerateQR = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "CREATE" }),
      });
      
      if (!res.ok) throw new Error("Falha ao gerar QR Code");
      
      const data = await res.json();
      setStatus(data.status);
      if (data.qr) {
        setQrCode(data.qr);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao conectar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar seu WhatsApp? As notificações deixarão de ser enviadas.")) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/teacher/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "LOGOUT" }),
      });
      
      if (res.ok) {
        setStatus("uninitialized");
        setQrCode(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="whatsapp-config-page">
      <header className="page-header">
        <div className="header-title">
          <MessageCircle className="icon-title" size={28} />
          <h2>WhatsApp Bot (Notificações)</h2>
        </div>
        <p>Conecte seu WhatsApp para que o sistema possa enviar mensagens automáticas para seus alunos.</p>
      </header>

      <div className="whatsapp-card">
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {isLoading && status === "loading" ? (
          <div className="loading-state">
            <RefreshCw className="spinner" size={32} />
            <p>Verificando conexão com o servidor...</p>
          </div>
        ) : status === "open" ? (
          <div className="connected-state animate-fade-in">
            <div className="success-icon">
              <CheckCircle2 size={64} />
            </div>
            <h3>WhatsApp Conectado!</h3>
            <p>Seu número está vinculado e pronto para enviar mensagens automáticas.</p>
            <button className="btn-danger" onClick={handleDisconnect} disabled={isLoading}>
              {isLoading ? <RefreshCw className="spinner" size={16} /> : <LogOut size={16} />}
              Desconectar WhatsApp
            </button>
          </div>
        ) : status === "connecting" || qrCode ? (
          <div className="qr-state animate-fade-in">
            <h3>Escaneie o QR Code</h3>
            <p>Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código abaixo:</p>
            
            <div className="qr-container">
              {qrCode ? (
                <img src={qrCode} alt="WhatsApp QR Code" className="qr-image" />
              ) : (
                <div className="qr-loading">
                  <RefreshCw className="spinner" size={24} />
                  <span>Gerando QR Code...</span>
                </div>
              )}
            </div>
            
            <div className="actions">
              <button className="btn-secondary" onClick={fetchStatus} disabled={isLoading}>
                <RefreshCw className={`icon ${isLoading ? 'spinner' : ''}`} size={16} />
                Atualizar QR Code
              </button>
            </div>
          </div>
        ) : (
          <div className="disconnected-state animate-fade-in">
            <div className="empty-icon">
              <QrCode size={64} />
            </div>
            <h3>WhatsApp Desconectado</h3>
            <p>Você ainda não conectou seu WhatsApp. Clique no botão abaixo para gerar um QR Code e vincular seu número.</p>
            <button className="btn-primary" onClick={handleGenerateQR} disabled={isLoading}>
              {isLoading ? <RefreshCw className="spinner" size={16} /> : <QrCode size={16} />}
              Gerar QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

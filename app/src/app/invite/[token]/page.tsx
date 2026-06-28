"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, ArrowRight, ArrowLeft, ShieldCheck, Music } from "lucide-react";
import "./invite.css";

type Module = {
  id: string;
  title: string;
  price: number;
  description: string;
};

type LinkData = {
  id: string;
  token: string;
  studentName: string;
  teacher: { name: string; whatsapp?: string };
  instruments: string[];
  paymentMethods: string[];
  modules: { module: Module }[];
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Stepper State
  const [step, setStep] = useState(1);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchLinkData(token: string) {
    try {
      const res = await fetch(`/api/links/${token}`);
      if (res.ok) {
        const data = await res.json();
        setLinkData(data);
        if (data.studentName) setName(data.studentName);
        if (data.instruments?.length > 0) setSelectedInstrument(data.instruments[0]);
        if (data.paymentMethods?.length > 0) setSelectedPaymentMethod(data.paymentMethods[0]);
      } else {
        const errData = await res.json();
        setError(errData.error || "Link inválido ou expirado.");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.token) {
      // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
      void fetchLinkData(params.token as string);
    }
  }, [params.token]);

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      setSelectedModules(selectedModules.filter(m => m !== id));
    } else {
      setSelectedModules([...selectedModules, id]);
    }
  };

  const getSelectedTotal = () => {
    if (!linkData) return 0;
    return linkData.modules
      .filter(m => selectedModules.includes(m.module.id))
      .reduce((acc, curr) => acc + curr.module.price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          name,
          email,
          password,
          whatsapp,
          selectedModules,
          instrument: selectedInstrument,
          paymentMethod: selectedPaymentMethod,
        })
      });

      if (res.ok) {
        setStep(5); // Success step
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao realizar matrícula");
        setSubmitting(false);
      }
    } catch {
      alert("Erro de conexão");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-screen">Carregando sua proposta...</div>;
  }

  if (error || !linkData) {
    return (
      <div className="error-screen">
        <div className="error-card">
          <h2>Ops!</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-layout">
      {/* Header / Stepper Progress */}
      {step < 5 && (
        <header className="stepper-header">
          <div className="stepper-container">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-circle">1</div>
              <span>Conhecer</span>
            </div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-circle">2</div>
              <span>Planos</span>
            </div>
            <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-circle">3</div>
              <span>Matrícula</span>
            </div>
            <div className={`step-line ${step >= 4 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>
              <div className="step-circle">4</div>
              <span>Reserva</span>
            </div>
          </div>
        </header>
      )}

      <main className="invite-main">
        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <div className="step-content animate-fade-in text-center welcome-step">
            <div className="teacher-avatar">
              {linkData.teacher.name.charAt(0).toUpperCase()}
            </div>
            
            <h1 className="welcome-name">{linkData.studentName},</h1>
            <p className="welcome-text">
              Preparei esta proposta especialmente para você após nossa aula experimental.
            </p>
            <p className="welcome-subtext">
              Aqui você encontrará todas as informações necessárias para iniciar sua jornada musical comigo, de forma organizada, transparente e personalizada.
            </p>

            <div className="benefits-card">
              <h3>O que você irá conquistar durante sua evolução:</h3>
              <ul className="benefits-list">
                <li><Check size={18} className="text-primary" /> Aprender no seu ritmo</li>
                <li><Check size={18} className="text-primary" /> Tocar suas músicas favoritas</li>
                <li><Check size={18} className="text-primary" /> Desenvolver disciplina e concentração</li>
                <li><Check size={18} className="text-primary" /> Evoluir com acompanhamento individual</li>
                <li><Check size={18} className="text-primary" /> Construir uma base musical sólida</li>
              </ul>
            </div>

            <div className="exclusive-box">
              <span className="exclusive-label">PROPOSTA EXCLUSIVA PREPARADA PARA:</span>
              <strong className="exclusive-name">{linkData.studentName}</strong>
            </div>
            
            <div className="action-column">
              <button className="btn-primary btn-large btn-block" onClick={() => setStep(2)}>
                Conhecer Meus Planos
              </button>
              {linkData.teacher.whatsapp && (
                <a href={`https://wa.me/${linkData.teacher.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="btn-outline btn-large btn-block btn-link">
                  Falar com o Professor
                </a>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: MODULES (PLANS) */}
        {step === 2 && (
          <div className="step-content animate-fade-in">
            <h2 className="section-title">Escolha como deseja evoluir</h2>
            <p className="section-subtitle">Selecione os módulos que deseja incluir na sua matrícula.</p>
            
            <div className="plans-grid">
              {linkData.modules.map((m) => {
                const mod = m.module;
                const isSelected = selectedModules.includes(mod.id);
                return (
                  <div 
                    key={mod.id} 
                    className={`plan-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleModule(mod.id)}
                  >
                    {isSelected && <div className="selected-badge"><Check size={14} /> Selecionado</div>}
                    <h3 className="plan-title">{mod.title}</h3>
                    <div className="plan-price">
                      R$ {mod.price.toFixed(2)}
                    </div>
                    <p className="plan-desc">{mod.description || "Acesso completo às aulas e materiais deste módulo."}</p>
                    <button className={`btn-outline ${isSelected ? 'active' : ''}`}>
                      {isSelected ? "Remover" : "Adicionar ao Carrinho"}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="action-row space-between sticky-bottom">
              <button className="btn-text" onClick={() => setStep(1)}>
                <ArrowLeft size={18} /> Voltar
              </button>
              <button 
                className="btn-primary btn-large" 
                onClick={() => setStep(3)}
                disabled={selectedModules.length === 0}
              >
                Continuar <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUMMARY */}
        {step === 3 && (
          <div className="step-content animate-fade-in">
            <h2 className="section-title">Resumo da sua matrícula</h2>
            
            <div className="summary-card">
              <div className="summary-items">
                {linkData.modules
                  .filter(m => selectedModules.includes(m.module.id))
                  .map(m => (
                    <div key={m.module.id} className="summary-item">
                      <span>{m.module.title}</span>
                      <strong>R$ {m.module.price.toFixed(2)}</strong>
                    </div>
                  ))
                }
              </div>
              <div className="summary-total">
                <span>Valor Total</span>
                <strong>R$ {getSelectedTotal().toFixed(2)}</strong>
              </div>
            </div>

            <div className="info-alert">
              <ShieldCheck size={20} />
              <p>O pagamento será realizado diretamente com o professor após a conclusão da reserva. Sua vaga ficará garantida!</p>
            </div>

            <div className="action-row space-between">
              <button className="btn-text" onClick={() => setStep(2)}>
                <ArrowLeft size={18} /> Voltar
              </button>
              <button className="btn-primary btn-large" onClick={() => setStep(4)}>
                Preencher Dados <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REGISTRATION */}
        {step === 4 && (
          <div className="step-content animate-fade-in">
            <h2 className="section-title">Solicitar Reserva da Minha Vaga</h2>
            <p className="section-subtitle">Após receber sua solicitação, o professor entrará em contato para alinhar os detalhes e o pagamento.</p>
            
            <form onSubmit={handleSubmit} className="registration-form">
              <div className="form-group">
                <label>Nome Completo</label>
                <input 
                  required 
                  className="input-field" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>E-mail</label>
                <input 
                  required 
                  type="email" 
                  className="input-field" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>WhatsApp</label>
                <input 
                  required 
                  type="tel" 
                  className="input-field" 
                  value={whatsapp} 
                  onChange={e => setWhatsapp(e.target.value)} 
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="form-group">
                <label>Crie uma Senha para Acesso</label>
                <input 
                  required 
                  type="password" 
                  className="input-field" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Mínimo de 6 caracteres"
                  minLength={6}
                />
              </div>

              {linkData.instruments && linkData.instruments.length > 0 && (
                <div className="form-group">
                  <label>Qual instrumento você vai cursar?</label>
                  <select 
                    required 
                    className="input-field"
                    value={selectedInstrument}
                    onChange={e => setSelectedInstrument(e.target.value)}
                  >
                    <option value="" disabled>Selecione um instrumento...</option>
                    {linkData.instruments.map(inst => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </div>
              )}

              {linkData.paymentMethods && linkData.paymentMethods.length > 0 && (
                <div className="form-group">
                  <label>Como prefere realizar o pagamento?</label>
                  <select 
                    required 
                    className="input-field"
                    value={selectedPaymentMethod}
                    onChange={e => setSelectedPaymentMethod(e.target.value)}
                  >
                    <option value="" disabled>Selecione uma forma de pagamento...</option>
                    {linkData.paymentMethods.map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="action-row space-between" style={{ marginTop: '24px' }}>
                <button type="button" className="btn-text" onClick={() => setStep(3)}>
                  <ArrowLeft size={18} /> Voltar
                </button>
                <button type="submit" className="btn-primary btn-large" disabled={submitting}>
                  {submitting ? "Processando..." : "Finalizar Reserva"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 5: SUCCESS */}
        {step === 5 && (
          <div className="step-content animate-fade-in text-center success-step">
            <div className="success-icon">
              <Check size={48} />
            </div>
            <h1 className="main-title">Reserva Solicitada com Sucesso!</h1>
            <p className="subtitle">O professor <strong>{linkData.teacher.name}</strong> foi notificado da sua matrícula.</p>
            
            <div className="next-steps-card">
              <h3>Próximos Passos:</h3>
              <ol>
                <li>O professor entrará em contato via WhatsApp.</li>
                <li>Você realiza o pagamento diretamente para ele.</li>
                <li>Ele libera seu acesso na plataforma!</li>
              </ol>
            </div>

            <div className="action-row centered">
              <button className="btn-primary" onClick={() => router.push('/login')}>
                Ir para o Login
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

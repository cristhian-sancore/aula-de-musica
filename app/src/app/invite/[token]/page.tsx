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
  isMonthly?: boolean;
};

type LinkData = {
  id: string;
  token: string;
  studentName: string;
  instruments: string[];
  paymentMethods: string[];
  modules: { module: Module }[];
  teacher: {
    name: string;
    image?: string | null;
    whatsapp?: string;
    settings?: {
      cardTaxRate: number;
      enrollmentFee?: number;
    }
  };
  computedAvailableSlots?: { day: number, time: string, endTime?: string, capacity: number }[];
};

const DAYS_OF_WEEK = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
];

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
  const [installments, setInstallments] = useState(1);
  const [responsavel, setResponsavel] = useState("");
  const [horario, setHorario] = useState("");
  const [cidade, setCidade] = useState("");
  const [conheceu, setConheceu] = useState("");
  const [observacoes, setObservacoes] = useState("");
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
    // Permite selecionar apenas um plano por vez
    setSelectedModules([id]);
  };

  const getSelectedTotal = () => {
    if (!linkData) return 0;
    const baseTotal = linkData.modules
      .filter(m => selectedModules.includes(m.module.id))
      .reduce((acc, curr) => acc + curr.module.price, 0);

    const isCreditCard = selectedPaymentMethod.toLowerCase().includes("cartão") || selectedPaymentMethod.toLowerCase().includes("cartao");
    const taxRate = linkData.teacher.settings?.cardTaxRate || 0;
    const enrollmentFee = (linkData.teacher.settings?.enrollmentFee !== undefined && linkData.teacher.settings?.enrollmentFee !== null) ? linkData.teacher.settings.enrollmentFee : 90;

    let total = baseTotal;
    
    // Matrícula is added to the final cost if it's > 0
    if (enrollmentFee > 0) {
      total += enrollmentFee;
    }

    if (isCreditCard && installments >= 4 && taxRate > 0) {
      // The tax rate is usually applied to the recurring payment, but we will apply it to the final total
      total = total + (total * taxRate / 100);
    }
    
    return total;
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
          installments: installments.toString(),
          responsavel,
          horario,
          cidade,
          conheceu,
          observacoes
        })
      });

      if (res.ok) {
        setStep(4); // Success step
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
              <div className="step-circle"><Check size={14}/></div>
              <span>Concluído</span>
            </div>
          </div>
        </header>
      )}

      <main className="invite-main">
        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <div className="step-content animate-fade-in text-center welcome-step">
            <div className="teacher-avatar">
              {linkData.teacher.image ? (
                <img 
                  src={linkData.teacher.image} 
                  alt={linkData.teacher.name} 
                  className="teacher-avatar-img" 
                />
              ) : (
                linkData.teacher.name.charAt(0).toUpperCase()
              )}
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
                    <div className="plan-price-container">
                      {(() => {
                        const divisor = 12; // Sempre dividir por 12, conforme solicitado pelo usuário
                        const isMensal = mod.isMonthly || mod.title.toLowerCase().includes('mensal'); // Fallback to title check for old modules

                        if (mod.price > 0) {
                          if (isMensal) {
                            return (
                              <>
                                <div className="plan-price-highlight" style={{ fontSize: '1.8rem' }}>
                                  R$ {mod.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="plan-price-cash">
                                  por mês
                                </div>
                              </>
                            );
                          }

                          return (
                            <>
                              <div className="plan-price-highlight">
                                {divisor}x de R$ {(mod.price / divisor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="plan-price-cash">
                                ou R$ {mod.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} à vista
                              </div>
                            </>
                          );
                        } else {
                          return (
                            <div className="plan-price-highlight">
                              Grátis
                            </div>
                          );
                        }
                      })()}
                    </div>
                    <p className="plan-desc">{mod.description || "Acesso completo às aulas e materiais deste módulo."}</p>
                    <button className={`btn-outline ${isSelected ? 'active' : ''}`}>
                      {isSelected ? "Plano Selecionado" : "Escolher Plano"}
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

        {/* STEP 3: REGISTRATION */}
        {step === 3 && (
          <div className="step-content animate-fade-in">
            <h2 className="section-title">Solicitar Reserva da Minha Vaga</h2>
            <p className="section-subtitle">Após receber sua solicitação entrarei em contato para confirmar o melhor horário disponível.</p>
            
            <form onSubmit={handleSubmit} className="registration-form-container">
              
              {/* TAXA DE MATRÍCULA (IMAGE 1) - Only shown if fee > 0 */}
              {((linkData.teacher.settings?.enrollmentFee !== undefined ? linkData.teacher.settings.enrollmentFee : 90) > 0) && (
                <div className="stylish-card enrollment-fee-card" style={{ border: '2px solid var(--color-primary)', backgroundColor: 'var(--color-bg)' }}>
                  <span className="card-label" style={{ backgroundColor: 'var(--color-primary)', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}>TAXA DE MATRÍCULA (PAGA HOJE)</span>
                  <div className="fee-header">
                    <span className="fee-subtitle">Valor cobrado separadamente do plano para reserva da vaga</span>
                    <div className="plan-price-large">
                      R$ {(linkData.teacher.settings?.enrollmentFee !== undefined ? linkData.teacher.settings.enrollmentFee : 90).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="fee-highlight" style={{ backgroundColor: 'rgba(218, 123, 26, 0.1)', padding: '12px', borderRadius: '8px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                    Pagamento da matrícula exclusivamente à vista via PIX ou Dinheiro
                  </div>
                  
                  <h4 className="fee-includes-title">SUA MATRÍCULA INCLUI:</h4>
                  <ul className="fee-includes-list">
                    <li><Check size={18} className="text-primary" /> Reserva do horário</li>
                    <li><Check size={18} className="text-primary" /> Cadastro</li>
                    <li><Check size={18} className="text-primary" /> Planejamento individual</li>
                    <li><Check size={18} className="text-primary" /> Organização pedagógica</li>
                    <li><Check size={18} className="text-primary" /> Acompanhamento personalizado</li>
                  </ul>
                </div>
              )}
              
              {/* PLANO ESCOLHIDO CARD */}
              <div className="stylish-card">
                <span className="card-label">VALOR DO PLANO ESCOLHIDO</span>
                <h3 className="plan-name" style={{ marginTop: '8px' }}>
                  {linkData.modules.find(m => selectedModules.includes(m.module.id))?.module.title}
                </h3>
                <div className="plan-price-large" style={{ fontSize: '1.5rem' }}>
                  R$ {linkData.modules.find(m => selectedModules.includes(m.module.id))?.module.price.toFixed(2)}
                </div>
                <p className="section-subtitle" style={{ marginTop: '8px', marginBottom: 0 }}>
                  (O pagamento do plano será combinado posteriormente com o professor)
                </p>
              </div>

              {/* DADOS PESSOAIS */}
              <div className="stylish-card">
                <span className="card-label">DADOS PESSOAIS</span>
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Nome do aluno</label>
                  <input 
                    required 
                    className="input-field" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label>Nome do responsável</label>
                  <input 
                    className="input-field" 
                    value={responsavel} 
                    onChange={e => setResponsavel(e.target.value)} 
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
                  <label>E-mail (Para acessar o portal)</label>
                  <input 
                    required 
                    type="email" 
                    className="input-field" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
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
                  <label>Instrumento desejado</label>
                  <select 
                    required 
                    className="input-field"
                    value={selectedInstrument}
                    onChange={e => setSelectedInstrument(e.target.value)}
                  >
                    <option value="" disabled>Selecione...</option>
                    {linkData.instruments.map(inst => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </div>
              )}

                {linkData.computedAvailableSlots && linkData.computedAvailableSlots.length > 0 ? (
                  <div className="form-group">
                    <label>Horário da Aula</label>
                    <select 
                      required 
                      className="input-field"
                      value={horario}
                      onChange={e => setHorario(e.target.value)}
                    >
                      <option value="" disabled>Escolha um horário...</option>
                      {linkData.computedAvailableSlots.map(slot => {
                        const slotValue = slot.endTime ? `${slot.day}-${slot.time}-${slot.endTime}` : `${slot.day}-${slot.time}`;
                        const slotLabel = slot.endTime ? `${DAYS_OF_WEEK[slot.day]} das ${slot.time} às ${slot.endTime}` : `${DAYS_OF_WEEK[slot.day]} às ${slot.time}`;
                        return (
                          <option key={slotValue} value={slotValue}>{slotLabel}</option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Horário desejado</label>
                    <input 
                      className="input-field" 
                      value={horario} 
                      onChange={e => setHorario(e.target.value)} 
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Cidade (opcional)</label>
                  <input 
                    className="input-field" 
                    value={cidade} 
                    onChange={e => setCidade(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label>Como conheceu meu trabalho?</label>
                  <select 
                    className="input-field"
                    value={conheceu}
                    onChange={e => setConheceu(e.target.value)}
                  >
                    <option value="" disabled>Selecione...</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Google">Google</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Observações</label>
                  <textarea 
                    className="input-field" 
                    rows={3}
                    value={observacoes} 
                    onChange={e => setObservacoes(e.target.value)} 
                  />
                </div>
              </div>

              {/* FORMA DE PAGAMENTO CARD */}
              <div className="stylish-card">
                <span className="card-label">FORMA DE PAGAMENTO</span>
                {linkData.paymentMethods && linkData.paymentMethods.length > 0 && (
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label>Forma de Pagamento do Plano</label>
                    <select 
                      required 
                      className="input-field"
                      value={selectedPaymentMethod}
                      onChange={e => {
                        setSelectedPaymentMethod(e.target.value);
                        if (!e.target.value.toLowerCase().includes("cartão") && !e.target.value.toLowerCase().includes("cartao")) {
                          setInstallments(1); // Reset if not credit card
                        }
                      }}
                    >
                      <option value="" disabled>Selecione...</option>
                      {linkData.paymentMethods.map(pm => (
                        <option key={pm} value={pm}>{pm}</option>
                      ))}
                    </select>
                  </div>
                )}

              {(selectedPaymentMethod.toLowerCase().includes("cartão") || selectedPaymentMethod.toLowerCase().includes("cartao")) && (
                <div className="form-group animate-fade-in">
                  <label>Em quantas vezes?</label>
                  <select 
                    required 
                    className="input-field"
                    value={installments}
                    onChange={e => setInstallments(parseInt(e.target.value))}
                  >
                    {[...Array(12)].map((_, i) => {
                      const parcels = i + 1;
                      return (
                        <option key={parcels} value={parcels}>{parcels}x</option>
                      )
                    })}
                  </select>
                  {installments >= 4 && (linkData.teacher.settings?.cardTaxRate || 0) > 0 && (
                    <small className="help-text" style={{ color: 'var(--color-primary)' }}>
                      Pagamentos a partir de 4x possuem um acréscimo de {linkData.teacher.settings?.cardTaxRate}% repassado da operadora.
                    </small>
                  )}
                </div>
              )}

              {selectedPaymentMethod && (
                <div className="summary-total" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                  <span>Valor Final da Matrícula</span>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1.25rem' }}>R$ {getSelectedTotal().toFixed(2)}</strong>
                    {(selectedPaymentMethod.toLowerCase().includes("cartão") || selectedPaymentMethod.toLowerCase().includes("cartao")) && installments > 1 && (
                      <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        {installments}x de R$ {(getSelectedTotal() / installments).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>

              <div className="action-row space-between" style={{ marginTop: '24px' }}>
                <button type="button" className="btn-text" onClick={() => setStep(2)}>
                  <ArrowLeft size={18} /> Voltar
                </button>
                <button type="submit" className="btn-primary btn-large" disabled={submitting}>
                  {submitting ? "Processando..." : "Enviar Solicitação"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <div className="step-content animate-fade-in text-center success-step">
            <h2 className="section-title">Solicitação Enviada!</h2>
            <p className="subtitle">O professor <strong>{linkData.teacher.name}</strong> foi notificado da sua matrícula.</p>
            
            <div className="next-steps-card">
              <h3>Próximos Passos</h3>
              <div className="numbered-steps">
                <div className="num-step">
                  <div className="num-circle">1</div>
                  <p>Recebo sua solicitação.</p>
                </div>
                <div className="num-step">
                  <div className="num-circle">2</div>
                  <p>Analiso os horários disponíveis.</p>
                </div>
                <div className="num-step">
                  <div className="num-circle">3</div>
                  <p>Entro em contato.</p>
                </div>
                <div className="num-step">
                  <div className="num-circle">4</div>
                  <p>Após confirmação da matrícula sua vaga será oficialmente reservada.</p>
                </div>
              </div>
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

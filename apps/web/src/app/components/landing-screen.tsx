import { useState } from "react";
import {
  User, Video, MessageSquare, TrendingUp, Target, Award,
  X, Menu, ArrowRight, CheckCircle, Zap, Lightbulb,
  AlertCircle, Check, GraduationCap,
} from "lucide-react";
import { RHConnectLogo } from "./brand/rh-connect-logo";
import { Button as UIButton } from "./ui/button";
import { Card as UICard } from "./ui/card";
import { Badge as UIBadge } from "./ui/badge";

type NavFn = (s: string) => void;

function Btn({
  variant = "primary", size = "md", children, onClick, disabled = false, className = "",
}: {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const buttonVariant = variant === "danger" ? "destructive" : variant;
  const buttonClassName = `${size === "sm" ? "text-xs" : ""} font-semibold cursor-pointer ${className}`;

  return (
    <UIButton
      variant={buttonVariant}
      size={size}
      className={buttonClassName}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </UIButton>
  );
}

function Badge({ variant = "default", children }: {
  variant?: "default" | "success" | "warning" | "error" | "info" | "purple";
  children: React.ReactNode;
}) {
  const vars = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    error:   "bg-red-100 text-red-700",
    info:    "bg-blue-100 text-blue-700",
    purple:  "bg-purple-100 text-purple-700",
  };
  return <UIBadge variant="neutral" className={`font-semibold ${vars[variant]}`}>{children}</UIBadge>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <UICard padding="none" className={className}>
      {children}
    </UICard>
  );
}

export function LandingScreen({ onNavigate }: { onNavigate: NavFn }) {
  const HOW_CARDS = [
    { n: "01", icon: User,          title: "Configure seu objetivo",   desc: "Complete seu perfil e informe a vaga ou o cargo para o qual deseja se preparar." },
    { n: "02", icon: Video,         title: "Faça sua entrevista",      desc: "Responda perguntas relacionadas ao seu objetivo em uma simulação por vídeo." },
    { n: "03", icon: MessageSquare, title: "Receba seu feedback",      desc: "Veja uma avaliação estruturada sobre suas respostas e seu desempenho." },
    { n: "04", icon: TrendingUp,    title: "Evolua a cada tentativa",  desc: "Consulte seu relatório, identifique melhorias e pratique novamente." },
  ];

  const BENEFITS = [
    { icon: Target,        title: "Prática personalizada",          desc: "Treine com perguntas relacionadas ao cargo, à vaga e ao seu perfil profissional.",       color: "text-blue-600 bg-blue-50" },
    { icon: MessageSquare, title: "Feedback claro e estruturado",   desc: "Entenda seus pontos fortes e o que pode melhorar em cada resposta.",                    color: "text-green-600 bg-green-50" },
    { icon: Award,         title: "Mais confiança para entrevistas",desc: "Pratique em um ambiente seguro antes de participar de um processo seletivo real.",       color: "text-purple-600 bg-purple-50" },
    { icon: TrendingUp,    title: "Acompanhe sua evolução",         desc: "Compare suas tentativas e perceba seu desenvolvimento ao longo do tempo.",               color: "text-amber-600 bg-amber-50" },
  ];

  const FOR_WHO = [
    { label: "Primeiro emprego",               desc: "Prepare-se para sua primeira entrevista com segurança e clareza." },
    { label: "Jovem aprendiz",                 desc: "Desenvolva comunicação e confiança desde o início da carreira." },
    { label: "Estágio",                        desc: "Destaque-se em seleções com respostas mais estruturadas." },
    { label: "Recolocação profissional",       desc: "Volte ao mercado com mais preparo e segurança nas entrevistas." },
    { label: "Mudança de área",                desc: "Demonstre seu potencial e mostre por que você é o candidato certo para uma nova área." },
    { label: "Desenvolvimento de comunicação", desc: "Melhore sua expressão oral e objetividade em qualquer contexto profissional." },
  ];

  const REPORT_CRITERIA = [
    { name: "Clareza",      score: 9, color: "bg-green-500" },
    { name: "Coerência",    score: 9, color: "bg-green-500" },
    { name: "Objetividade", score: 8, color: "bg-green-500" },
    { name: "Comunicação",  score: 8, color: "bg-green-500" },
    { name: "Organização",  score: 7, color: "bg-blue-500"  },
    { name: "Segurança",    score: 6, color: "bg-amber-500" },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-white w-full">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-border px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          <RHConnectLogo className="h-8 sm:h-9 w-auto" />
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            <a href="#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
            <a href="#beneficios"    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Benefícios</a>
            <a href="#para-quem"     className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Para quem é</a>
            <a href="#sobre"         className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sobre o projeto</a>
          </nav>
          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            <Btn variant="outline" size="sm" onClick={() => onNavigate("auth")}>Entrar</Btn>
            <Btn variant="primary" size="sm" onClick={() => onNavigate("auth")}>Criar conta</Btn>
          </div>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-2">
            {[
              { label: "Como funciona", href: "#como-funciona" },
              { label: "Benefícios",    href: "#beneficios" },
              { label: "Para quem é",   href: "#para-quem" },
              { label: "Sobre o projeto", href: "#sobre" },
            ].map(link => (
              <a key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Btn variant="outline" size="sm" className="flex-1" onClick={() => onNavigate("auth")}>Entrar</Btn>
              <Btn variant="primary" size="sm" className="flex-1" onClick={() => onNavigate("auth")}>Criar conta</Btn>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section style={{ background: "linear-gradient(135deg, #0F2652 0%, #1D4ED8 100%)" }} className="px-4 sm:px-8 py-14 sm:py-20 lg:py-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-5">
              Seu treinamento para conquistar a vaga dos seus sonhos
            </h1>
            <p className="text-blue-200 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
              Pratique entrevistas relacionadas ao seu objetivo profissional, desenvolva suas respostas e receba orientações para evoluir.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Btn size="lg" variant="primary" onClick={() => onNavigate("auth")} className="!bg-white !text-blue-700 hover:!bg-slate-100 hover:shadow-lg w-full sm:w-auto">
                Começar agora <ArrowRight className="w-5 h-5" />
              </Btn>
              <a href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 w-full sm:w-auto">
                Ver como funciona
              </a>
            </div>
          </div>
          {/* Dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center"><Zap className="w-3 h-3 text-white" /></div>
                    <span className="text-xs font-bold text-slate-700">RH Connect</span>
                  </div>
                  <Badge variant="success"><span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block mr-1" />Logado</Badge>
                </div>
                <div className="p-4 bg-slate-50">
                  <p className="text-xs font-bold text-slate-700 mb-3">Olá, Maria! 👋</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "Entrevistas", v: "3", color: "bg-blue-500" },
                      { label: "Aguardando",  v: "1", color: "bg-amber-500" },
                      { label: "Concluídas",  v: "1", color: "bg-green-500" },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-lg p-2 text-center border border-slate-100">
                        <div className={`w-5 h-5 ${s.color} rounded mx-auto mb-1`} />
                        <p className="text-sm font-bold text-slate-800">{s.v}</p>
                        <p className="text-[9px] text-slate-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-600 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-white text-[11px] font-semibold">Iniciar nova entrevista</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl px-3 py-2 shadow-xl border border-slate-100 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-[10px] font-bold text-slate-700">Relatório disponível</p>
                <p className="text-[9px] text-slate-400">Nota: 7,8 · Classificação: Boa</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="px-4 sm:px-8 py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-blue-600 text-sm font-bold uppercase tracking-wider mb-3">Como funciona</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">Prepare-se para entrevistas em 4 etapas</h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Uma experiência simples para você praticar, receber orientação e evoluir a cada tentativa.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_CARDS.map(step => (
              <Card key={step.n} className="p-6 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-extrabold text-blue-100 leading-none">{step.n}</span>
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefícios ── */}
      <section id="beneficios" className="px-4 sm:px-8 py-14 sm:py-20 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-blue-600 text-sm font-bold uppercase tracking-wider mb-3">Benefícios</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Por que usar o RH Connect?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {BENEFITS.map(b => (
              <Card key={b.title} className="p-5 sm:p-7 flex gap-4 sm:gap-5 hover:shadow-md transition-shadow duration-200">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${b.color}`}>
                  <b.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1.5">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prévia do relatório ── */}
      <section className="px-4 sm:px-8 py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div>
            <p className="text-blue-600 text-sm font-bold uppercase tracking-wider mb-3">Relatório de desempenho</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">
              Transforme cada entrevista em aprendizado
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Receba uma visão clara do seu desempenho, com destaques sobre comunicação, objetividade, segurança e organização das respostas.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Nota geral com classificação de desempenho",
                "Avaliação detalhada por critério",
                "Pontos fortes identificados na entrevista",
                "Oportunidades de melhoria com orientações claras",
                "Recomendação do avaliador para sua próxima tentativa",
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Btn variant="primary" size="lg" onClick={() => onNavigate("auth")}>
              Começar minha preparação <ArrowRight className="w-5 h-5" />
            </Btn>
          </div>
          <div>
            <Card className="overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resultado da entrevista</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">Analista de Marketing Digital</p>
                </div>
                <Badge variant="info">Boa</Badge>
              </div>
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-4 p-4 bg-background rounded-xl">
                  <div className="text-center shrink-0">
                    <p className="text-3xl sm:text-4xl font-extrabold text-foreground">7,8</p>
                    <p className="text-xs text-muted-foreground">de 10,0</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Critérios</p>
                    <div className="space-y-1.5">
                      {REPORT_CRITERIA.map(c => (
                        <div key={c.name} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16 sm:w-20 shrink-0 truncate">{c.name}</span>
                          <div className="flex-1 bg-muted rounded-full h-1.5 min-w-0">
                            <div className={`${c.color} h-1.5 rounded-full`} style={{ width: `${c.score * 10}%` }} />
                          </div>
                          <span className="text-xs font-bold text-foreground w-4 shrink-0">{c.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-green-500" /> Pontos fortes
                  </p>
                  <div className="space-y-1.5">
                    {["Clareza e objetividade nas respostas", "Boa estrutura lógica ao apresentar exemplos"].map(p => (
                      <div key={p} className="flex items-start gap-2 text-xs text-foreground bg-green-50 rounded-lg px-3 py-2">
                        <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" /> {p}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> A desenvolver
                  </p>
                  <div className="flex items-start gap-2 text-xs text-foreground bg-amber-50 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> Aumente a segurança com exemplos mais concretos
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" /> Recomendação do avaliador
                  </p>
                  <p className="text-xs text-blue-700/80 leading-relaxed">
                    Pratique mais uma entrevista com foco em segurança e profundidade nas respostas.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Para quem é ── */}
      <section id="para-quem" className="px-4 sm:px-8 py-14 sm:py-20 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-blue-600 text-sm font-bold uppercase tracking-wider mb-3">Para quem é</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">O RH Connect é para você</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
              Seja qual for o momento da sua carreira, a plataforma se adapta ao seu objetivo.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FOR_WHO.map((item, i) => (
              <Card key={item.label} className="p-5 sm:p-6 flex gap-4 hover:shadow-md transition-shadow duration-200">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-extrabold shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{item.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA central ── */}
      <section className="px-4 sm:px-8 py-12 sm:py-16" style={{ background: "linear-gradient(135deg, #0F2652 0%, #1D4ED8 100%)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">Comece a se preparar agora</h2>
          <p className="text-blue-200 mb-8 leading-relaxed">
            Crie sua conta em poucos minutos e faça sua primeira entrevista simulada ainda hoje.
          </p>
          <Btn size="lg" onClick={() => onNavigate("auth")} className="!bg-white !text-blue-700 hover:!bg-slate-100 hover:shadow-lg font-bold">
            Criar minha conta <ArrowRight className="w-5 h-5" />
          </Btn>
        </div>
      </section>

      {/* ── Sobre o projeto ── */}
      <section id="sobre" className="px-4 sm:px-8 py-12 sm:py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 sm:p-8 bg-slate-50 rounded-2xl border border-border">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sobre o projeto</p>
              <p className="text-foreground text-sm sm:text-base leading-relaxed max-w-2xl">
                O RH Connect é uma iniciativa desenvolvida no <strong>SENAC-DF</strong> que une Recursos Humanos, tecnologia e educação para apoiar pessoas na preparação para entrevistas de emprego.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-4 sm:px-8 py-10 sm:py-12 bg-[#021025]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div>
              <RHConnectLogo variant="inverse" className="h-7 w-auto mb-2" />
              <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                Plataforma de preparação para entrevistas. Desenvolvida no SENAC-DF.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-2 sm:gap-y-3">
              {[
                { label: "Como funciona",  href: "#como-funciona" },
                { label: "Benefícios",     href: "#beneficios" },
                { label: "Sobre o projeto",href: "#sobre" },
                { label: "Termos de uso",  href: "#" },
                { label: "Privacidade",    href: "#" },
                { label: "Contato",        href: "#" },
              ].map(link => (
                <a key={link.label} href={link.href} className="text-slate-400 hover:text-white text-sm transition-colors duration-150">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-6">
            <p className="text-slate-600 text-xs text-center">
              © 2026 RH Connect · Iniciativa educacional SENAC-DF · Todos os direitos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

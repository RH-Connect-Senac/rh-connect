import { useState } from "react";
import {
  User, MessageSquare, TrendingUp, Target, Award,
  X, Menu, ArrowRight, CheckCircle, Lightbulb,
  AlertCircle, Check, GraduationCap,
} from "lucide-react";
import heroEntrevista from "../../assets/landing/hero-entrevista-3.webp";
import { RHConnectLogo } from "./brand/rh-connect-logo";
import { Button as UIButton } from "./ui/button";
import { Card as UICard } from "./ui/card";
import { Badge as UIBadge } from "./ui/badge";
import { ROUTER_BASENAME } from "../router/routes";

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
    error: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
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
    { n: "01", icon: User, title: "Configure seu objetivo", desc: "Complete seu perfil e informe a vaga ou o cargo para o qual deseja se preparar." },
    { n: "02", icon: MessageSquare, title: "Faça sua entrevista", desc: "Responda perguntas relacionadas à vaga em uma simulação textual com opção de ditado por voz." },
    { n: "03", icon: MessageSquare, title: "Receba seu feedback", desc: "Veja uma avaliação estruturada sobre suas respostas e seu desempenho." },
    { n: "04", icon: TrendingUp, title: "Evolua a cada tentativa", desc: "Consulte seu relatório, identifique melhorias e pratique novamente." },
  ];

  const BENEFITS = [
    { icon: Target, title: "Prática personalizada", desc: "Treine com perguntas relacionadas ao cargo, à vaga e ao seu perfil profissional.", color: "text-blue-600 bg-blue-50" },
    { icon: MessageSquare, title: "Feedback claro e estruturado", desc: "Entenda seus pontos fortes e o que pode melhorar em cada resposta.", color: "text-green-600 bg-green-50" },
    { icon: Award, title: "Mais confiança para entrevistas", desc: "Pratique em um ambiente seguro antes de participar de um processo seletivo real.", color: "text-purple-600 bg-purple-50" },
    { icon: TrendingUp, title: "Acompanhe sua evolução", desc: "Compare suas tentativas e perceba seu desenvolvimento ao longo do tempo.", color: "text-amber-600 bg-amber-50" },
  ];

  const FOR_WHO = [
    { label: "Primeiro emprego", desc: "Prepare-se para sua primeira entrevista com segurança e clareza." },
    { label: "Jovem aprendiz", desc: "Desenvolva comunicação e confiança desde o início da carreira." },
    { label: "Estágio", desc: "Destaque-se em seleções com respostas mais estruturadas." },
    { label: "Recolocação profissional", desc: "Volte ao mercado com mais preparo e segurança nas entrevistas." },
    { label: "Mudança de área", desc: "Demonstre seu potencial e mostre por que você é o candidato certo para uma nova área." },
    { label: "Desenvolvimento de comunicação", desc: "Melhore sua expressão oral e objetividade em qualquer contexto profissional." },
  ];

  const REPORT_CRITERIA = [
    { name: "Clareza", score: 9, color: "bg-green-500" },
    { name: "Coerência", score: 9, color: "bg-green-500" },
    { name: "Objetividade", score: 8, color: "bg-green-500" },
    { name: "Domínio", score: 8, color: "bg-green-500" },
    { name: "Organização", score: 7, color: "bg-blue-500" },
    { name: "Exemplos", score: 6, color: "bg-amber-500" },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reloadHome = () => {
    window.location.assign(`${ROUTER_BASENAME}/`);
  };

  return (
    <div className="bg-white w-full">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-border px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          <button
            type="button"
            onClick={reloadHome}
            className="cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Ir para a página inicial"
          >
            <RHConnectLogo className="h-8 sm:h-9 w-auto" />
          </button>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            <a href="#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
            <a href="#beneficios" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Benefícios</a>
            <a href="#para-quem" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Para quem é</a>
            <a href="#sobre" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sobre o projeto</a>
          </nav>
          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            <Btn variant="outline" size="sm" onClick={() => onNavigate("auth")}>Entrar</Btn>
            <Btn variant="primary" size="sm" onClick={() => onNavigate("register")}>Criar conta</Btn>
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
              { label: "Benefícios", href: "#beneficios" },
              { label: "Para quem é", href: "#para-quem" },
              { label: "Sobre o projeto", href: "#sobre" },
            ].map(link => (
              <a key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Btn variant="outline" size="sm" className="flex-1" onClick={() => onNavigate("auth")}>Entrar</Btn>
              <Btn variant="primary" size="sm" className="flex-1" onClick={() => onNavigate("register")}>Criar conta</Btn>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-white px-4 py-14 sm:px-8 sm:py-20 lg:py-20">
        <div className="absolute inset-0 -z-10">
          <img
            src={heroEntrevista}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="
        h-full w-full object-cover
        object-[60%_center]
        sm:object-[65%_center]
        lg:object-[62%_center]
      "
          />

          <div
            className="
        absolute inset-0
        bg-[linear-gradient(180deg,_rgba(255,255,255,0.88)_0%,_rgba(255,255,255,0.80)_28%,_rgba(255,255,255,0.74)_52%,_rgba(255,255,255,0.56)_72%,_rgba(255,255,255,0.20)_100%)]
        sm:bg-[linear-gradient(90deg,_rgba(255,255,255,0.96)_0%,_rgba(255,255,255,0.90)_30%,_rgba(239,246,255,0.72)_48%,_rgba(30,91,255,0.18)_62%,_rgba(0,0,0,0)_78%)]
      "
          />
        </div>

        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-[22rem] sm:max-w-xl">
            <h1 className="mb-5 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl lg:text-5xl">
              Seu treinamento para conquistar a vaga dos seus sonhos
            </h1>

            <p className="mb-8 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              Pratique entrevistas relacionadas ao seu objetivo profissional,
              desenvolva suas respostas e receba orientações para evoluir.
            </p>

            <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
              <Btn
                size="lg"
                variant="primary"
                onClick={() => onNavigate("register")}
                className="w-full shadow-lg shadow-blue-600/20 sm:w-auto"
              >
                Começar agora <ArrowRight className="h-5 w-5" />
              </Btn>

              <a
                href="#como-funciona"
                className="
            inline-flex w-full items-center justify-center gap-2
            rounded-xl
            border border-white/70
            bg-white/75
            px-6 py-3.5
            text-base font-semibold text-blue-700
            shadow-sm backdrop-blur-md
            transition-all duration-200
            hover:bg-white
            sm:w-auto
          "
              >
                Ver como funciona
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section
        id="como-funciona"
        className="bg-white px-4 py-16 sm:px-8 sm:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-blue-600">
              Como funciona
            </p>

            <h2 className="mx-auto mb-4 max-w-2xl text-2xl font-extrabold leading-tight text-foreground sm:text-3xl lg:text-4xl">
              Prepare-se para entrevistas em 4 etapas
            </h2>

            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Uma experiência simples para você praticar, receber orientação e evoluir a cada tentativa.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_CARDS.map((step) => (
              <Card
                key={step.n}
                className="
            group relative overflow-hidden
            border border-slate-200/80
            bg-white p-6
            transition-all duration-300
            hover:-translate-y-1
            hover:border-blue-200
            hover:shadow-lg
            hover:shadow-blue-950/5
          "
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-4xl font-black leading-none text-blue-100 transition-colors duration-300 group-hover:text-blue-200">
                    {step.n}
                  </span>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors duration-300 group-hover:bg-blue-100">
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>

                <h3 className="mb-2 text-base font-bold text-foreground sm:text-lg">
                  {step.title}
                </h3>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>

                <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-200/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefícios ── */}
      <section id="beneficios" className="px-4 sm:px-8 py-14 sm:py-20 bg-slate-50/60">
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
            <Btn variant="primary" size="lg" onClick={() => onNavigate("register")}>
              Começar minha preparação <ArrowRight className="w-5 h-5" />
            </Btn>
          </div>
          <div>
            <Card className="overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resultado da entrevista</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">Desenvolvedor Full Stack</p>
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
          <Btn size="lg" onClick={() => onNavigate("register")} className="!bg-white !text-blue-700 hover:!bg-slate-100 hover:shadow-lg font-bold">
            Criar minha conta <ArrowRight className="w-5 h-5" />
          </Btn>
        </div>
      </section>

      {/* ── Sobre o projeto ── */}
      <section id="sobre" className="px-4 sm:px-8 py-12 sm:py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="p-5 sm:p-8 bg-slate-50 rounded-2xl border border-border">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>

              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Sobre o projeto
              </p>

              <div className="space-y-4 text-foreground text-sm sm:text-base leading-relaxed">
                <p>
                  O RH Connect é uma iniciativa desenvolvida no Senac Sobradinho que integra
                  tecnologia e educação com o objetivo de apoiar pessoas na preparação para
                  processos seletivos e entrevistas de emprego.
                </p>

                <p>
                  O projeto é resultado da colaboração entre diferentes áreas de formação,
                  promovendo uma experiência interdisciplinar entre as turmas:
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm">
                <p className="font-bold text-foreground">
                  Técnico em Recursos Humanos
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Turma 2025.11.95
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Rafael Castro Rezende Santos
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm">
                <p className="font-bold text-foreground">
                  Técnico em Secretariado
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Turma 2025.11.99
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Thatiana Soares e Silva
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm">
                <p className="font-bold text-foreground">
                  Técnico em Dev. de Sistemas
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Turma 2025.11.33
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Jamesson Will Pereira da Cruz Santos
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contato" className="px-4 sm:px-8 py-10 sm:py-12 bg-[#021025]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div>
              <button
                type="button"
                onClick={reloadHome}
                className="mb-2 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#021025]"
                aria-label="Ir para a página inicial"
              >
                <RHConnectLogo variant="inverse" className="h-7 w-auto" />
              </button>
              <p className="max-w-xs text-[13px] font-normal leading-relaxed text-slate-500">
                Plataforma de preparação para entrevistas.
                <br />
                Desenvolvida por alunos do SENAC Sobradinho.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-2 sm:gap-y-3">
              {[
                { label: "Como funciona", href: "#como-funciona" },
                { label: "Benefícios", href: "#beneficios" },
                { label: "Sobre o projeto", href: "#sobre" },
                { label: "Termos de uso", screen: "terms" },
                { label: "Privacidade", screen: "privacy" },
                { label: "Contato", href: "#contato" },
              ].map(link => (
                "screen" in link ? (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => onNavigate(link.screen)}
                    className="text-left text-sm font-normal leading-5 text-slate-400 transition-colors duration-150 hover:text-white"
                  >
                    {link.label}
                  </button>
                ) : (
                  <a key={link.label} href={link.href} className="text-sm font-normal leading-5 text-slate-400 transition-colors duration-150 hover:text-white">
                    {link.label}
                  </a>
                )
              ))}
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-6">
            <p className="text-center text-xs font-normal leading-5 text-slate-600">
              © 2026 RH Connect · Iniciativa Educacional SENAC Sobradinho · Todos os direitos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

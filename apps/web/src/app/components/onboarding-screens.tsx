/** RH Connect — Onboarding do Candidato */

import { useState } from "react";
import {
  CheckCircle, ChevronRight, User, Briefcase,
  Video, Award, Star, Zap, ArrowRight, Check,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { RHConnectLogo } from "./brand/rh-connect-logo";

type NavFn = (s: string) => void;

// ─── Nilo Avatar ──────────────────────────────────────────────────────────────

function NiloAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-10 h-10 text-lg", md: "w-16 h-16 text-2xl", lg: "w-20 h-20 text-3xl" };
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg ring-4 ring-blue-100`}>
      N
    </div>
  );
}

// ─── Step data ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 0,
    icon: Star,
    color: "bg-amber-100 text-amber-600",
    title: "Olá! Eu sou o Nilo.",
    subtitle: "Seu guia no RH Connect",
    content: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Seja muito bem-vindo ao <strong className="text-foreground">RH Connect do SENAC-DF</strong>. Sou o Nilo,
          e vou te guiar pelos primeiros passos da plataforma.
        </p>
        <p>
          Aqui você pode participar de processos seletivos por meio de entrevistas em vídeo,
          acompanhar seu progresso e desenvolver suas habilidades profissionais.
        </p>
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <Zap className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">Esta introdução leva menos de 2 minutos. Vamos lá!</p>
        </div>
      </div>
    ),
  },
  {
    id: 1,
    icon: User,
    color: "bg-green-100 text-green-600",
    title: "Seu perfil profissional",
    subtitle: "Deixe sua candidatura mais completa",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Após concluir esta introdução, você poderá completar seu <strong className="text-foreground">perfil profissional</strong> com:
        </p>
        <ul className="space-y-2">
          {[
            "Formação acadêmica e cursos",
            "Experiências profissionais",
            "Competências e habilidades",
            "Foto de perfil",
          ].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs">
          Um perfil completo aumenta suas chances de ser selecionado para oportunidades relevantes.
        </p>
      </div>
    ),
  },
  {
    id: 2,
    icon: Video,
    color: "bg-purple-100 text-purple-600",
    title: "Como funciona a entrevista",
    subtitle: "Simples, flexível e no seu tempo",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>O processo de seleção no RH Connect funciona assim:</p>
        <div className="space-y-2">
          {[
            { step: "1", label: "Encontre uma vaga", desc: "Navegue pelas oportunidades disponíveis" },
            { step: "2", label: "Realize a entrevista", desc: "Responda às perguntas em vídeo no seu próprio ritmo" },
            { step: "3", label: "Aguarde a avaliação", desc: "Nossos avaliadores analisam sua resposta com atenção" },
            { step: "4", label: "Receba seu relatório", desc: "Veja seu desempenho detalhado e dicas de melhoria" },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
              <div>
                <p className="font-semibold text-foreground text-xs">{s.label}</p>
                <p className="text-xs">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 3,
    icon: Award,
    color: "bg-indigo-100 text-indigo-600",
    title: "Tudo pronto!",
    subtitle: "Comece sua jornada agora",
    content: (
      <div className="space-y-4 text-sm text-muted-foreground text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <p>
          Você já sabe tudo o que precisa para começar. Seu dashboard está pronto com as informações
          mais relevantes para a sua jornada.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { icon: Briefcase, label: "Vagas disponíveis" },
            { icon: Video,     label: "Iniciar entrevista" },
            { icon: Award,     label: "Ver meu relatório" },
            { icon: User,      label: "Completar perfil" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Icon className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export function CandidateOnboardingScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur border-b border-border">
        <RHConnectLogo className="h-10 w-auto" />
        <button
          onClick={() => onNavigate("dashboard")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Pular introdução →
        </button>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/40" : "w-4 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Card */}
          <Card padding="none" className="p-6 sm:p-8">
            {/* Nilo + Icon */}
            <div className="flex items-center gap-4 mb-6">
              <NiloAvatar size="md" />
              <div className={`w-12 h-12 rounded-2xl ${current.color} flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>

            {/* Text */}
            <h2 className="text-xl font-bold text-foreground mb-1">{current.title}</h2>
            <p className="text-sm text-muted-foreground mb-5">{current.subtitle}</p>

            {/* Content */}
            <div className="mb-8">{current.content}</div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                  Voltar
                </Button>
              )}
              {isLast ? (
                <Button variant="primary" className="flex-1" onClick={() => onNavigate("dashboard")}>
                  Ir para o Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button variant="primary" className="flex-1" onClick={() => setStep(s => s + 1)}>
                  Próximo <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </Card>

          {/* Step counter */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Passo {step + 1} de {STEPS.length}
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

import { RHConnectLogo } from "./brand/rh-connect-logo";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";
import { Textarea } from "./ui/textarea";
import { ROUTER_BASENAME } from "../router/routes";
import { submitTesterFeedback } from "../services/tester-feedback-service";

type FeedbackFormState = {
  feature: string;
  bugFound: string;
  stepsToReproduce: string;
  improvementSuggestion: string;
};

const INITIAL_FEEDBACK_FORM: FeedbackFormState = {
  feature: "",
  bugFound: "",
  stepsToReproduce: "",
  improvementSuggestion: "",
};

function useNoIndexMeta() {
  useEffect(() => {
    const existingMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousContent = existingMeta?.getAttribute("content") ?? null;
    const robotsMeta = existingMeta ?? document.createElement("meta");

    robotsMeta.setAttribute("name", "robots");
    robotsMeta.setAttribute("content", "noindex,nofollow");
    if (!existingMeta) {
      document.head.appendChild(robotsMeta);
    }

    return () => {
      if (existingMeta) {
        if (previousContent == null) {
          existingMeta.removeAttribute("content");
        } else {
          existingMeta.setAttribute("content", previousContent);
        }
      } else {
        robotsMeta.remove();
      }
    };
  }, []);
}

export function SuggestionsScreen() {
  const [form, setForm] = useState<FeedbackFormState>(INITIAL_FEEDBACK_FORM);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useNoIndexMeta();

  const updateField = (field: keyof FeedbackFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (status === "error") {
      setStatus("idle");
      setMessage("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedFeature = form.feature.trim();
    const trimmedBugFound = form.bugFound.trim();
    const trimmedStepsToReproduce = form.stepsToReproduce.trim();
    const trimmedImprovementSuggestion = form.improvementSuggestion.trim();

    if (!trimmedBugFound && !trimmedImprovementSuggestion) {
      setStatus("error");
      setMessage("Informe um bug encontrado ou uma sugestão de melhoria.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      await submitTesterFeedback({
        feature: trimmedFeature,
        bugFound: trimmedBugFound,
        stepsToReproduce: trimmedStepsToReproduce,
        improvementSuggestion: trimmedImprovementSuggestion,
      });
      setStatus("success");
      setMessage("Relato enviado com sucesso. Obrigado por ajudar a testar o RH Connect.");
      setForm(INITIAL_FEEDBACK_FORM);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar seu relato.");
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="text-center">
          <a
            aria-label="Ir para a página inicial do RH Connect"
            className="inline-flex cursor-pointer"
            href={`${ROUTER_BASENAME}/`}
          >
            <RHConnectLogo className="h-9 w-auto" />
          </a>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Sugestões e Relatos de Teste
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Encontrou algum problema ou tem uma sugestão durante os testes?
            <br />
            Registre aqui para nossa equipe analisar.
          </p>
        </div>

        <Card className="p-5 sm:p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="feedback-feature">
                Funcionalidade
              </label>
              <Input
                id="feedback-feature"
                value={form.feature}
                onChange={(event) => updateField("feature", event.target.value)}
                placeholder="Ex.: Nova entrevista, Materiais, Relatório..."
                maxLength={150}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="feedback-bug">
                Bug encontrado
              </label>
              <Textarea
                id="feedback-bug"
                value={form.bugFound}
                onChange={(event) => updateField("bugFound", event.target.value)}
                placeholder="Descreva o problema encontrado, se houver."
                maxLength={2000}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="feedback-steps">
                Como repetir o erro
              </label>
              <Textarea
                id="feedback-steps"
                value={form.stepsToReproduce}
                onChange={(event) => updateField("stepsToReproduce", event.target.value)}
                placeholder="Conte o passo a passo para chegar no problema."
                maxLength={2000}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="feedback-improvement">
                Sugestão de melhoria
              </label>
              <Textarea
                id="feedback-improvement"
                value={form.improvementSuggestion}
                onChange={(event) => updateField("improvementSuggestion", event.target.value)}
                placeholder="Registre uma ideia, ajuste ou melhoria percebida durante o teste."
                maxLength={2000}
              />
            </div>

            {status === "success" && (
              <Alert variant="success" className="flex gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{message}</p>
              </Alert>
            )}

            {status === "error" && (
              <Alert variant="error" className="flex gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{message}</p>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button type="submit" className="enabled:cursor-pointer" disabled={status === "submitting"}>
                {status === "submitting" ? (
                  <>
                    <Spinner /> Enviando
                  </>
                ) : (
                  "Enviar relato"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}

import { ChevronLeft } from "lucide-react";

import { RHConnectLogo } from "../brand/rh-connect-logo";
import { Button } from "../ui/button";

/** Header institucional das páginas legais, com a mesma presença pública da Landing. */
export function LegalHeader({
  authenticated,
  onOpenHome,
  onOpenLogin,
  onOpenRegister,
  onOpenArea,
  backAction,
}: {
  authenticated: boolean;
  onOpenHome: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenArea: () => void;
  /** Origem contextual (cadastro ou Configurações). Quando existe, substitui as demais ações. */
  backAction?: { label: string; onClick: () => void };
}) {
  const buttonClassName = "cursor-pointer text-xs font-semibold";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
        <button
          type="button"
          onClick={onOpenHome}
          className="cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Ir para a página inicial"
        >
          <RHConnectLogo className="h-8 w-auto sm:h-9" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          {backAction ? (
            <Button
              variant="outline"
              size="sm"
              className={buttonClassName}
              onClick={backAction.onClick}
              aria-label={backAction.label}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sm:hidden">Voltar</span>
              <span className="hidden sm:inline">{backAction.label}</span>
            </Button>
          ) : authenticated ? (
            <Button variant="outline" size="sm" className={buttonClassName} onClick={onOpenArea}>
              Ir para minha área
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" className={buttonClassName} onClick={onOpenLogin}>
                Entrar
              </Button>
              <Button variant="primary" size="sm" className={buttonClassName} onClick={onOpenRegister}>
                Criar conta
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

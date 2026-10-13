import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guardas de código-fonte (sem DOM) para três refinamentos de UX: nome no menu de perfil,
// backdrop da modal "Deseja sair da entrevista?" e envio semântico do login.
const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(join(here, "..", relative), "utf8").replace(/\s+/g, " ");
const app = read("App.tsx");
const popovers = read("components/header-popovers.tsx");
const alertDialog = read("components/ui/alert-dialog.tsx");

function block(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThan(-1);
  expect(end > start).toBe(true);
  return source.slice(start, end);
}

describe("menu de perfil: nome longo", () => {
  const dropdown = block(popovers, "export function AccountDropdown", "// ───");
  it("nome ocupa até 2 linhas com quebra natural; e-mail segue em 1 linha", () => {
    expect(dropdown).toMatch(/<p className="(?=[^"]*line-clamp-2)(?=[^"]*break-words)[^"]*"[^>]*>\{config\.name\}<\/p>/);
    expect(dropdown).toMatch(/<p className="[^"]*\btruncate\b[^"]*"[^>]*>\{config\.email\}<\/p>/);
    // o nome não usa mais truncate de linha única nem fonte menor
    expect(dropdown).not.toMatch(/<p className="[^"]*\btruncate\b[^"]*"[^>]*>\{config\.name\}/);
    expect(dropdown).toContain('text-sm font-bold');
  });
  it("largura do dropdown inalterada e conteúdo identificável sem hover (title é só complemento)", () => {
    expect(dropdown).toContain("w-56");
    expect(dropdown).toContain("min-w-0");
    expect(dropdown).toContain("title={config.name}");
    expect(dropdown).toContain("title={config.email}");
  });
  it("as ações do menu continuam presentes", () => {
    expect(dropdown).toContain("{config.profileLabel}");
    expect(dropdown).toContain("Configurações");
    expect(dropdown).toContain("Sair");
    expect(dropdown).toContain('onNavigate("auth")');
  });
});

describe("modal 'Deseja sair da entrevista?': fechar pelo backdrop", () => {
  const modal = block(app, "function ConfirmModal({", "function SettingsScreen(");
  it("o overlay só fecha quando a modal habilita (opt-in) e ignora cliques que não são no próprio overlay", () => {
    expect(alertDialog).toContain("onOverlayClick?: () => void");
    expect(alertDialog).toMatch(/onClick=\{onOverlayClick \? \(event\) => \{ if \(event\.target === event\.currentTarget\) onOverlayClick\(\); \} : undefined\}/);
    // o overlay é irmão do conteúdo: clique dentro da modal não chega nele
    expect(alertDialog).toMatch(/<AlertDialogOverlay .*?\/> <AlertDialogPrimitive\.Content/);
  });
  it("backdrop = dismiss (mesmo caminho do X/Esc), nunca confirma nem cancela a entrevista", () => {
    expect(modal).toContain("dismissOnBackdrop = false");
    expect(modal).toContain("onOverlayClick={dismissOnBackdrop ? dismiss : undefined}");
    expect(modal).toContain("const dismiss = onClose ?? onCancel;");
    expect(modal).toContain("onClick={dismiss}"); // X
    expect(modal).toContain("onOpenChange={(open) => { if (!open) dismiss(); }}"); // Esc
    expect(modal).not.toMatch(/onOverlayClick=\{[^}]*(onConfirm|onCancel\b)/);
  });
  it("habilitado só no 'Deseja sair da entrevista?' (não na confirmação do cancelamento nem nos demais modais)", () => {
    expect(app.match(/dismissOnBackdrop=\{/g)?.length).toBe(1);
    expect(app).toContain("dismissOnBackdrop={!confirmCancelInterview}");
  });
  it("o onClose do 'Deseja sair' só fecha: não executa 'Sair e continuar depois' nem cancela", () => {
    const onClose = block(app, "onClose={() => {", "{confirmCancelInterview && cancelState.error");
    expect(onClose).toContain("setPendingNavigationScreen(null)");
    expect(onClose).not.toMatch(/cancelActiveInterview|executeNavigation|flushBeforeLeaving|window\.history/);
  });
  it("foco inicial seguro e focus-visible da correção anterior seguem iguais", () => {
    expect(modal).toContain("resolveInitialFocus({ showCancel, initialFocus })");
    expect(app).toContain('initialFocus={confirmCancelInterview ? "cancel" : "confirm"}');
    expect(modal).toContain("CONFIRM_MODAL_FOCUS_RING");
  });
});

describe("login: Enter envia o formulário", () => {
  const auth = block(app, "const handleLoginSubmit = async () => {", "const handleRegisterSubmit");
  const form = block(app, "<form", "</form>");
  it("usa <form onSubmit> real, sem keydown manual de Enter", () => {
    expect(form).toContain("noValidate");
    expect(form).toMatch(/onSubmit=\{\(event\) => \{ event\.preventDefault\(\); void handleLoginSubmit\(\); \}\}/);
    expect(form).not.toMatch(/onKeyDown/);
    expect(form).not.toMatch(/event\.key === "Enter"/);
  });
  it("botão 'Entrar na plataforma' é type=submit e usa o mesmo handler (sem onClick duplicado)", () => {
    expect(form).toMatch(/<Btn variant="primary" type="submit"[^>]*disabled=\{isLoginSubmitting\}>/);
    expect(form).not.toMatch(/onClick=\{handleLoginSubmit\}/);
    expect(form).toContain('{isLoginSubmitting ? "Entrando..." : "Entrar na plataforma"}');
  });
  it("mesma chamada, mesmos erros, mesmo loading; double submit bloqueado", () => {
    expect(auth).toContain("if (loginSubmittingRef.current) return;");
    expect(auth).toContain("onLoginWithCredentials(loginEmail, loginPassword)");
    expect(auth).toContain("setLoginError(result.message)");
    expect(auth).toContain("loginSubmittingRef.current = false;");
    expect(auth).toContain("saveRememberedLoginEmail(loginEmail)");
  });
  it("botões auxiliares dentro do form não submetem (type=button)", () => {
    expect(form).toContain('<button type="button" onClick={() => onNavigate("forgot-password")}');
  });
  it("acessibilidade: labels associados, autocomplete e campos mantidos", () => {
    const field = block(app, "function Field({", "function FieldSelect(");
    expect(field).toContain("htmlFor={fieldId}");
    expect(field.match(/id=\{fieldId\}/g)?.length).toBe(2);
    expect(form).toContain('autoComplete="username"');
    expect(form).toContain('autoComplete="current-password"');
    expect(form).toContain('label="E-mail"');
    expect(form).toContain('label="Senha"');
    expect(form).toContain('placeholder="seuemail@gmail.com"');
    expect(form).toContain('placeholder="Sua senha"');
  });
});

describe("tipografia de Login e Cadastro (tokens compartilhados)", () => {
  const auth = block(app, "function AuthScreen({", "// ─── Screen 3: Dashboard");
  it("os seis campos de Login/Cadastro usam os mesmos tokens de label/input", () => {
    expect(app).toContain("const AUTH_LABEL_CLASS =");
    expect(auth.match(/\{\.\.\.AUTH_FIELD_PROPS\}/g)?.length).toBe(6);
    // outros formulários mantêm o label padrão do Field
    expect(app).toContain('labelClassName ?? "block text-sm font-semibold text-foreground mb-1.5"');
  });
  it("links e textos de rodapé têm tamanho explícito (button/label têm 16px por padrão no tema)", () => {
    expect(auth).toContain('className="text-primary font-medium hover:underline text-sm"'); // Esqueci minha senha
    expect(auth).toContain('<label htmlFor="remember-access" className="text-sm ');
    expect(auth).toMatch(/\{tab === "login" \? "Não tem uma conta\? " : "Já tem uma conta\? "\}/);
    expect(auth).toMatch(/<button onClick=\{\(\) => selectAuthTab[^>]*className="text-\[13px\]/);
  });
  it("bloco legal mantém checkbox, links e textos, sem mudar a estrutura", () => {
    expect(auth).toContain('type="checkbox"');
    expect(auth).toContain("registerAcceptedTerms");
    expect(auth).toContain('onNavigate("terms")');
    expect(auth).toContain('onNavigate("privacy")');
    expect(auth).toContain(">Termos de uso</button>");
    expect(auth).toContain(">Política de privacidade</button>");
    expect(auth).toContain("Li e aceito os");
    expect(auth).toContain('<span className="text-red-500">*</span>');
  });
  it("estrutura e comportamento do login/cadastro inalterados", () => {
    expect(auth).toContain("noValidate");
    expect(auth).toContain('type="submit"');
    expect(auth).toContain("handleRegisterSubmit");
    expect(auth).toContain('{isRegisterSubmitting ? "Criando conta..." : "Criar minha conta"}');
    expect(auth).toContain('max-w-md');
  });
});

/**
 * Copia texto para a área de transferência de forma segura.
 *
 * 1) `navigator.clipboard.writeText` (requer contexto seguro e gesto do usuário);
 * 2) fallback: textarea temporário + `document.execCommand("copy")`;
 * 3) se nada funcionar (ou a API não existir), devolve `false` sem lançar erro.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permissão negada / contexto inseguro: tenta o fallback.
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (
    typeof document === "undefined" ||
    !document.body ||
    typeof document.execCommand !== "function"
  ) {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  textarea.style.opacity = "0";

  let copied = false;
  try {
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.parentNode?.removeChild(textarea);
  }
  return copied;
}

/**
 * Detecção de itens NOVOS em listas sincronizadas (microanimação da 6A.3).
 * Estado efêmero de UI: sem storage, sem backend, sem React.
 *
 *  - a PRIMEIRA lista observada (carga inicial) vira apenas a linha de base:
 *    nada é "novo";
 *  - nas observações seguintes, "novo" = id que não estava no conjunto
 *    conhecido; depois o conjunto conhecido é atualizado, então a mesma lista
 *    de novo nunca marca ninguém;
 *  - ids removidos saem do conjunto conhecido e nunca contam como novos;
 *  - observar a MESMA referência de lista devolve o mesmo resultado (seguro
 *    para render duplicado do StrictMode);
 *  - falha de refresh não gera observação, então o conjunto conhecido não muda.
 */

export const EMPTY_NEW_IDS: ReadonlySet<string> = new Set<string>();

export class NewItemTracker {
  private known: Set<string> | null = null;
  private lastItems: readonly { id: string }[] | null = null;
  private lastResult: ReadonlySet<string> = EMPTY_NEW_IDS;

  observe(items: readonly { id: string }[]): ReadonlySet<string> {
    if (items === this.lastItems) return this.lastResult;
    const ids = new Set(items.map((item) => item.id));
    let result: ReadonlySet<string> = EMPTY_NEW_IDS;
    if (this.known !== null) {
      const fresh = new Set<string>();
      for (const id of ids) if (!this.known.has(id)) fresh.add(id);
      if (fresh.size > 0) result = fresh;
    }
    this.known = ids;
    this.lastItems = items;
    this.lastResult = result;
    return result;
  }
}

// Classes da microanimação (tw-animate-css já presente no projeto): fade-in +
// 8px de baixo para cima, ~300ms, só quando o usuário NÃO pede movimento
// reduzido (`motion-safe`). Não altera layout final nem foco/aria.
export const NEW_ITEM_ENTER_CLASS =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out";

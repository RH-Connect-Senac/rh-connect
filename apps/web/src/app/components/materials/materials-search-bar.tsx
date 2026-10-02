import { Search, X } from "lucide-react";

import { cn } from "../ui/utils";

type MaterialsSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
};

// Barra de busca em largura total (sem botão "Buscar" nem "Filtros").
// Componente controlado: não guarda estado nem filtra nada.
export function MaterialsSearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Buscar materiais, temas ou palavras-chave...",
  className,
}: MaterialsSearchBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 transition-[border-color,box-shadow] duration-150",
        "focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_1px_rgba(37,99,235,0.12)]",
        className,
      )}
    >
      <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="text"
        role="searchbox"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Buscar materiais"
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpar busca"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

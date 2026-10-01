import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "../ui/button";
import { cn } from "../ui/utils";

type MaterialsSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onFiltersClick?: () => void;
  placeholder?: string;
  className?: string;
};

// Busca integrada com o botão "Filtros" dentro da própria barra (sem botão
// "Buscar" separado). Componente controlado: não guarda estado nem filtra nada.
export function MaterialsSearchBar({
  value,
  onChange,
  onClear,
  onFiltersClick,
  placeholder = "Buscar materiais, temas ou palavras-chave...",
  className,
}: MaterialsSearchBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-card py-1.5 pl-3.5 pr-1.5 transition-[border-color,box-shadow] duration-150",
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
      <Button type="button" variant="outline" size="sm" onClick={onFiltersClick} className="shrink-0">
        <SlidersHorizontal aria-hidden="true" />
        Filtros
      </Button>
    </div>
  );
}

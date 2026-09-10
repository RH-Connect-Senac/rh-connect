import * as React from "react";
import { Search, X } from "lucide-react";

import { Input } from "./input";
import { cn } from "./utils";

type SearchInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  containerClassName?: string;
  onClear?: () => void;
  clearLabel?: string;
};

function SearchInput({
  className,
  containerClassName,
  value,
  disabled,
  onClear,
  clearLabel = "Limpar busca",
  ...props
}: SearchInputProps) {
  const hasValue = value != null && String(value).length > 0;

  return (
    <div className={cn("relative", containerClassName)}>
      <Search
        aria-hidden="true"
        className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="text"
        role="searchbox"
        value={value}
        disabled={disabled}
        className={cn("pl-10", onClear ? "pr-10" : "pr-4", className)}
        {...props}
      />
      {onClear && hasValue && !disabled && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export { SearchInput };

import * as React from "react";

import { Button } from "./button";
import { cn } from "./utils";

type FilterChipProps = Omit<React.ComponentProps<typeof Button>, "variant" | "aria-pressed"> & {
  selected?: boolean;
};

function FilterChip({ className, selected = false, ...props }: FilterChipProps) {
  return (
    <Button
      type="button"
      variant={selected ? "primary" : "ghost"}
      size="sm"
      aria-pressed={selected}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-semibold",
        selected ? "border-primary" : "bg-muted text-muted-foreground hover:bg-accent",
        className,
      )}
      {...props}
    />
  );
}

export { FilterChip };

import * as React from "react";

import { cn } from "./utils";

/**
 * Switch padrão do RH Connect: track 44×24 e thumb 20×20 ancorado com `left-0.5 top-0.5`
 * (2 px de margem nos dois lados). Desligado = `translate-x-0`, ligado = `translate-x-5`:
 * o thumb nunca sai do track. Tamanho fixo (`shrink-0`), sem variação por breakpoint.
 *
 * - `Switch`: controle interativo (button/role="switch"). Quem usa informa o nome acessível
 *   via `aria-label` ou `aria-labelledby`.
 * - `SwitchVisual`: o MESMO visual, porém decorativo (sem papel, sem foco, sem clique).
 */

const TRACK_BASE = "relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors";
const THUMB_BASE =
  "pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform";

function trackColor(checked: boolean) {
  return checked ? "bg-primary" : "bg-muted-foreground/30";
}

function thumbShift(checked: boolean) {
  return checked ? "translate-x-5" : "translate-x-0";
}

type SwitchProps = Omit<
  React.ComponentProps<"button">,
  "type" | "role" | "aria-checked" | "onChange" | "children"
> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

function Switch({ checked, onCheckedChange, onClick, disabled, className, ...props }: SwitchProps) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="switch"
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!disabled) onCheckedChange?.(!checked);
      }}
      className={cn(
        TRACK_BASE,
        trackColor(checked),
        "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span aria-hidden="true" data-slot="switch-thumb" className={cn(THUMB_BASE, thumbShift(checked))} />
    </button>
  );
}

function SwitchVisual({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span aria-hidden="true" data-slot="switch-visual" className={cn(TRACK_BASE, trackColor(checked), className)}>
      <span className={cn(THUMB_BASE, thumbShift(checked))} />
    </span>
  );
}

export { Switch, SwitchVisual };

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-[1.5] transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "",
        info: "",
        success: "",
        warning: "",
        danger: "",
        error: "",
      },
      appearance: {
        soft: "",
        outline: "",
        solid: "",
      },
    },
    compoundVariants: [
      { tone: "neutral", appearance: "soft", className: "border-transparent bg-slate-100 text-slate-700" },
      { tone: "info", appearance: "soft", className: "border-transparent bg-blue-100 text-blue-700" },
      { tone: "success", appearance: "soft", className: "border-transparent bg-green-100 text-green-700" },
      { tone: "warning", appearance: "soft", className: "border-transparent bg-amber-100 text-amber-700" },
      { tone: "danger", appearance: "soft", className: "border-transparent bg-red-100 text-red-700" },
      { tone: "error", appearance: "soft", className: "border-transparent bg-red-100 text-red-700" },

      { tone: "neutral", appearance: "outline", className: "border-border bg-card text-slate-700" },
      { tone: "info", appearance: "outline", className: "border-blue-200 bg-card text-blue-700" },
      { tone: "success", appearance: "outline", className: "border-green-200 bg-card text-green-700" },
      { tone: "warning", appearance: "outline", className: "border-amber-200 bg-card text-amber-700" },
      { tone: "danger", appearance: "outline", className: "border-red-200 bg-card text-red-700" },
      { tone: "error", appearance: "outline", className: "border-red-200 bg-card text-red-700" },

      { tone: "neutral", appearance: "solid", className: "border-transparent bg-slate-700 text-white" },
      { tone: "info", appearance: "solid", className: "border-transparent bg-primary text-primary-foreground" },
      { tone: "success", appearance: "solid", className: "border-transparent bg-green-600 text-white" },
      { tone: "warning", appearance: "solid", className: "border-transparent bg-amber-600 text-white" },
      { tone: "danger", appearance: "solid", className: "border-transparent bg-destructive text-white" },
      { tone: "error", appearance: "solid", className: "border-transparent bg-destructive text-white" },
    ],
    defaultVariants: {
      tone: "neutral",
      appearance: "soft",
    },
  },
);

function StatusBadge({
  className,
  tone,
  appearance,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusBadgeVariants>) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ tone, appearance }), className)}
      {...props}
    />
  );
}

export { StatusBadge, statusBadgeVariants };

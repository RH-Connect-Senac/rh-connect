import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-[1.5] transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3 focus-visible:border-[#1D4ED8] focus-visible:ring-[4px] focus-visible:ring-[rgba(29,78,216,0.24)] aria-invalid:border-destructive aria-invalid:ring-[4px] aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        neutral:
          "border-transparent bg-slate-100 text-slate-700",
        default:
          "border-transparent bg-slate-100 text-slate-700",
        subtle:
          "border-transparent bg-secondary text-secondary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        primary:
          "border-transparent bg-secondary text-primary",
        destructive:
          "border-transparent bg-red-100 text-red-700 [a&]:hover:bg-red-200 focus-visible:ring-destructive/20",
        outline:
          "border-border bg-card text-foreground [a&]:hover:bg-muted",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

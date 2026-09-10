import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium leading-[1.5] transition-all disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[#1D4ED8] focus-visible:ring-[4px] focus-visible:ring-[rgba(29,78,216,0.24)] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        primary:
          "border border-transparent bg-primary text-primary-foreground hover:bg-[#1E40AF] active:bg-[#1E3A8A]",
        default:
          "border border-transparent bg-primary text-primary-foreground hover:bg-[#1E40AF] active:bg-[#1E3A8A]",
        destructive:
          "border border-transparent bg-destructive text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-destructive/20",
        danger:
          "border border-transparent bg-destructive text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-destructive/20",
        outline:
          "border border-border bg-card text-foreground hover:bg-muted active:bg-slate-100",
        secondary:
          "border border-transparent bg-secondary text-secondary-foreground hover:bg-blue-100 active:bg-blue-200",
        ghost:
          "border border-transparent text-foreground hover:bg-muted active:bg-slate-100",
        link:
          "h-auto rounded-none border border-transparent p-0 text-primary underline-offset-4 hover:underline focus-visible:rounded-sm",
      },
      size: {
        sm: "px-3 py-1.5 has-[>svg]:px-2.5",
        md: "px-4 py-2.5 has-[>svg]:px-3",
        default: "px-4 py-2.5 has-[>svg]:px-3",
        lg: "px-6 py-3.5 text-base has-[>svg]:px-5",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

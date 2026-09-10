import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground border-border flex w-full min-w-0 rounded-xl border bg-card px-4 py-2.5 text-sm font-medium leading-[1.5] text-foreground transition-[border-color,box-shadow] duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#2563EB] focus-visible:shadow-[0_0_0_1px_rgba(37,99,235,0.12)]",
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_1px_rgba(220,38,38,0.12)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

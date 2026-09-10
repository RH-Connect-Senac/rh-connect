import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-border placeholder:text-muted-foreground/70 flex field-sizing-content min-h-24 w-full rounded-xl border bg-card px-4 py-2.5 text-sm font-medium leading-[1.5] text-foreground transition-[border-color,box-shadow] duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#2563EB] focus-visible:shadow-[0_0_0_1px_rgba(37,99,235,0.12)]",
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_1px_rgba(220,38,38,0.12)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

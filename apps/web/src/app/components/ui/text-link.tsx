import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "./utils";

function TextLink({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"a"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="text-link"
      className={cn(
        "font-medium text-primary underline-offset-4 transition-colors hover:text-[#1E40AF] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-[rgba(29,78,216,0.24)]",
        className,
      )}
      {...props}
    />
  );
}

export { TextLink };

import type * as React from "react";

import { cn } from "./utils";

type SpinnerProps = React.ComponentProps<"span"> & {
  size?: "sm" | "md";
};

function Spinner({ className, size = "sm", ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        size === "sm" ? "size-4" : "size-5",
        className,
      )}
      {...props}
    />
  );
}

export { Spinner };

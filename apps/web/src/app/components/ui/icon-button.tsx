import * as React from "react";

import { Button } from "./button";
import { cn } from "./utils";

type IconButtonProps = Omit<React.ComponentProps<typeof Button>, "children" | "size"> & {
  icon: React.ReactNode;
  size?: "sm" | "md" | "lg";
  label?: string;
};

function IconButton({
  icon,
  label,
  className,
  size = "md",
  "aria-label": ariaLabel,
  ...props
}: IconButtonProps) {
  const accessibleName = ariaLabel ?? label;

  return (
    <Button
      data-slot="icon-button"
      size="icon"
      className={cn(
        size === "sm" && "size-8",
        size === "md" && "size-10",
        size === "lg" && "size-12",
        className,
      )}
      aria-label={accessibleName}
      title={label}
      {...props}
    >
      {icon}
    </Button>
  );
}

export { IconButton };

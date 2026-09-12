import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "./input";
import { cn } from "./utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  showLabel?: string;
  hideLabel?: string;
  toggleClassName?: string;
};

function PasswordInput({
  className,
  disabled,
  visible,
  defaultVisible = false,
  onVisibleChange,
  showLabel = "Mostrar senha",
  hideLabel = "Ocultar senha",
  toggleClassName,
  ...props
}: PasswordInputProps) {
  const [internalVisible, setInternalVisible] = React.useState(defaultVisible);
  const isControlled = visible !== undefined;
  const isVisible = isControlled ? visible : internalVisible;

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const nextVisible = !isVisible;

    if (!isControlled) {
      setInternalVisible(nextVisible);
    }

    onVisibleChange?.(nextVisible);
  };

  return (
    <div className="relative">
      <Input
        type={isVisible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-label={isVisible ? hideLabel : showLabel}
        className={cn(
          "absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
          toggleClassName,
        )}
      >
        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export { PasswordInput };

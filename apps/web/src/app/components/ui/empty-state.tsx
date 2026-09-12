import * as React from "react";

import { Card } from "./card";
import { cn } from "./utils";

type EmptyStateProps = React.ComponentProps<"div"> & {
  icon?: React.ElementType;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <Card className={cn("p-10 text-center", className)} {...props}>
      {Icon && (
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Icon className="size-7 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <p className="mb-2 font-bold text-foreground">{title}</p>
      {description && (
        <p className={cn("text-sm text-muted-foreground", action && "mb-5")}>
          {description}
        </p>
      )}
      {action}
    </Card>
  );
}

export { EmptyState };

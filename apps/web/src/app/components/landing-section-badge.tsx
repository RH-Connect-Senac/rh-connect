import type { ReactNode } from "react";

/**
 * Eyebrow editorial das seções da Landing ("badge + título grande abaixo").
 * Texto puramente decorativo/contextual: não é botão nem link, sem hover ou foco.
 * O espaçamento inferior (mb-4) até o título é controlado aqui.
 */
export function LandingSectionBadge({
  children,
  align = "center",
}: {
  children: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "left" ? "mb-4" : "mb-4 flex justify-center"}>
      <p className="inline-flex items-center rounded-lg border border-blue-200/70 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase leading-none tracking-[0.1em] text-blue-700">
        {children}
      </p>
    </div>
  );
}

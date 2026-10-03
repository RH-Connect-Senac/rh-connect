
/** Hero institucional compartilhado pelas páginas legais (Termos de Uso e Política de Privacidade). */
export function LegalHero({
  title,
  subtitle,
  updatedAt,
}: {
  title: string;
  subtitle?: string;
  updatedAt: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#021025] via-[#0A1F4D] to-[#1D4ED8] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <svg
          className="absolute -right-20 top-1/2 hidden h-[26rem] w-[26rem] -translate-y-1/2 text-white/10 sm:block"
          viewBox="0 0 400 400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <circle cx="200" cy="200" r="60" />
          <circle cx="200" cy="200" r="110" />
          <circle cx="200" cy="200" r="160" />
          <circle cx="200" cy="200" r="198" />
          <path d="M0 200h400M200 0v400" strokeDasharray="2 8" />
        </svg>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-9 sm:px-8 sm:py-12">
        <div className="max-w-3xl">
          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100/80 sm:text-lg">{subtitle}</p>}
          <p className="mt-5 text-sm text-blue-100/70">{updatedAt}</p>
        </div>
      </div>
    </section>
  );
}

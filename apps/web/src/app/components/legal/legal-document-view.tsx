import { Fragment, type ReactNode } from "react";
import { Info } from "lucide-react";

import type { LegalBlock, LegalDocument, LegalSection } from "../../domain/legal/legal-types";
import { Alert } from "../ui/alert";
import { Badge } from "../ui/badge";

// Placeholders do conteúdo jurídico, como [DATA] ou [CNPJ]. O texto é exibido exatamente
// como fornecido; apenas recebe um destaque visual para evidenciar o que ainda está pendente.
const PLACEHOLDER_PATTERN = /(\[[A-ZÀ-Ý][A-ZÀ-Ý0-9 /()-]*\])/;
const ARTICLE_LEAD_PATTERN = /^(Art\. \d+º?\.?|§\d+º|§Único\.|\d+\.\d+\.)(\s[\s\S]*)$/;
const ITEM_LEAD_PATTERN = /^(\d+(?:\.\d+)+\.|[a-z]\))(\s[\s\S]*)$/;

export function LegalText({ text }: { text: string }) {
  return (
    <>
      {text.split(PLACEHOLDER_PATTERN).map((part, index) =>
        index % 2 === 1 ? (
          <mark
            key={index}
            className="rounded bg-amber-100 px-1 py-0.5 font-semibold text-amber-800"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function LegalLeadText({ text, pattern }: { text: string; pattern: RegExp }) {
  const match = pattern.exec(text);
  if (!match) return <LegalText text={text} />;
  return (
    <>
      <strong className="font-bold text-foreground">{match[1]}</strong>
      <LegalText text={match[2]} />
    </>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }): ReactNode {
  switch (block.type) {
    case "paragraph":
      if (block.emphasis === "notice") {
        return (
          <Alert variant="info" className="rounded-xl border-l-4 border-l-primary">
            <Info className="h-4 w-4" />
            <p className="text-[0.9375rem] leading-7">
              <LegalLeadText text={block.text} pattern={ARTICLE_LEAD_PATTERN} />
            </p>
          </Alert>
        );
      }
      return (
        <p
          className={`text-[0.9375rem] leading-8 text-foreground/80 sm:text-base sm:leading-8 ${
            /^(Art\.|\d+\.\d+\.) /.test(block.text) ? "pt-3 first:pt-0" : ""
          }`}
        >
          <LegalLeadText text={block.text} pattern={ARTICLE_LEAD_PATTERN} />
        </p>
      );

    case "heading":
      return <h3 className="pt-3 text-base font-bold leading-snug text-foreground">{block.text}</h3>;

    case "list":
      return (
        <ul className="space-y-2.5 text-[0.9375rem] leading-7 text-foreground/80">
          {block.items.map((item, index) => {
            const match = ITEM_LEAD_PATTERN.exec(item);
            return (
              <li key={index} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-1 sm:grid-cols-[3.25rem_minmax(0,1fr)]">
                {match ? (
                  <>
                    <span className="font-semibold tabular-nums text-primary/80">{match[1]}</span>
                    <span className="min-w-0 break-words">
                      <LegalText text={match[2].trimStart()} />
                    </span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true" className="text-primary/60">•</span>
                    <span className="min-w-0 break-words">
                      <LegalText text={item} />
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      );

    case "definitions":
      return (
        <dl className="divide-y divide-border/70 border-y border-border/70">
          {block.items.map((item) => (
            <div key={item.term} className="gap-x-6 py-3.5 sm:grid sm:grid-cols-[13rem_minmax(0,1fr)]">
              <dt className="text-sm font-semibold leading-7 text-foreground">{item.term}</dt>
              <dd className="mt-1 break-words text-[0.9375rem] leading-7 text-foreground/80 sm:mt-0">
                <LegalText text={item.description} />
              </dd>
            </div>
          ))}
        </dl>
      );

    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm leading-6">
            <thead className="bg-muted/60 text-foreground">
              <tr>
                {block.headers.map((header) => (
                  <th key={header} scope="col" className="px-4 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-border align-top">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-3 ${cellIndex === 0 ? "font-medium text-foreground" : ""}`}
                    >
                      <LegalText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "chips":
      return (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{block.title}</p>
          <div className="flex flex-wrap gap-2">
            {block.items.map((item) => (
              <Badge key={item} variant="subtle" className="text-xs font-semibold">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      );

    case "stat":
      return (
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{block.label}</p>
          <p className="mt-1 text-2xl font-extrabold leading-tight text-primary">{block.value}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            <LegalLeadText text={block.text} pattern={ARTICLE_LEAD_PATTERN} />
          </p>
        </div>
      );

    default:
      return null;
  }
}

const CHAPTER_TITLE_PATTERN = /^(CAPÍTULO [IVXLCDM]+) – ([\s\S]+)$/;

function LegalSectionHeading({ section }: { section: LegalSection }) {
  const full = section.legalTitle ?? section.navTitle;
  const match = CHAPTER_TITLE_PATTERN.exec(full);

  if (!match) {
    return (
      <h2 className="mb-5 text-balance text-xl font-extrabold leading-snug tracking-tight text-foreground sm:text-2xl">
        {full}
      </h2>
    );
  }

  return (
    <h2 className="mb-5" aria-label={full}>
      <span aria-hidden="true" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-primary">
        {match[1]}
      </span>
      <span
        aria-hidden="true"
        className="block text-balance break-words text-xl font-extrabold leading-snug tracking-tight text-foreground sm:text-2xl"
      >
        {match[2]}
      </span>
    </h2>
  );
}

function LegalSectionView({ section }: { section: LegalSection }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-24 border-t border-border/70 py-10 first:border-t-0 first:pt-0 sm:py-12 sm:first:pt-0"
    >
      <LegalSectionHeading section={section} />
      {section.intro && (
        <p className="mb-4 text-base font-semibold leading-7 text-foreground/70">
          <LegalText text={section.intro} />
        </p>
      )}
      <div className="space-y-4">
        {section.blocks.map((block, index) => (
          <LegalBlockView key={index} block={block} />
        ))}
      </div>
    </section>
  );
}

export function LegalDocumentContent({ document }: { document: LegalDocument }) {
  return (
    <div>
      {document.sections.map((section) => (
        <LegalSectionView key={section.id} section={section} />
      ))}
    </div>
  );
}

export type LegalIndexItem = { id: string; title: string };

export function getLegalIndexItems(document: LegalDocument): LegalIndexItem[] {
  return document.sections.map((section) => ({ id: section.id, title: section.navTitle }));
}

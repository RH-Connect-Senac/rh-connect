export type LegalBlock =
  | { type: "paragraph"; text: string; emphasis?: "notice" }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "definitions"; items: { term: string; description: string }[] }
  | { type: "table"; headers: [string, string]; rows: [string, string][] }
  | { type: "chips"; title: string; items: string[] }
  | { type: "stat"; label: string; value: string; text: string };

export interface LegalSection {
  id: string;
  navTitle: string;
  legalTitle?: string;
  intro?: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSection[];
  closingStatement?: string;
}

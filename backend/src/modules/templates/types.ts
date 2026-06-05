/**
 * Editable template registry — types shared by the default templates, the
 * rendering service and the admin API.
 */

export type TemplateKind = 'email' | 'document';

/** Stable identifiers for every editable template. */
export type TemplateKey =
  | 'quote-sent'
  | 'invoice-sent'
  | 'booking-confirmation'
  | 'account-welcome'
  | 'quote-document'
  | 'invoice-document';

/** A variable exposed to the editor's insertion palette. */
export interface TemplateVariable {
  /** Handlebars path, e.g. "client.firstName" or "totals.ttc". */
  token: string;
  /** Human label shown in the editor. */
  label: string;
  /** Optional usage hint (e.g. loop variables). */
  hint?: string;
}

export interface TemplateDefinition {
  key: TemplateKey;
  kind: TemplateKind;
  name: string;
  description: string;
  /** Handlebars subject line (emails only). */
  subject?: string;
  /** Handlebars HTML source. Documents are full standalone pages. */
  html: string;
  /** Variables advertised to the editor palette. */
  variables: TemplateVariable[];
  /** Representative data used for live preview in the editor. */
  sampleData: Record<string, unknown>;
}

/** Public shape returned by the API (without heavy sampleData by default). */
export interface TemplateDTO {
  key: TemplateKey;
  kind: TemplateKind;
  name: string;
  description: string;
  subject: string | null;
  html: string;
  gjsData: unknown | null;
  variables: TemplateVariable[];
  /** Whether the stored row differs from the bundled default. */
  customized: boolean;
  updatedAt: string | null;
}

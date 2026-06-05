export type TemplateKind = 'email' | 'document';

export interface TemplateVariable {
  token: string;
  label: string;
  hint?: string;
}

export interface TemplateDTO {
  key: string;
  kind: TemplateKind;
  name: string;
  description: string;
  subject: string | null;
  html: string;
  gjsData: unknown | null;
  variables: TemplateVariable[];
  customized: boolean;
  updatedAt: string | null;
}

export interface TemplatePreview {
  subject: string;
  html: string;
}

export interface UpdateTemplatePayload {
  html: string;
  subject?: string | null;
  gjsData?: unknown;
}

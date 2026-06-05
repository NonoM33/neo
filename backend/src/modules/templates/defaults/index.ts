import type { TemplateDefinition, TemplateKey } from '../types';
import { quoteSentTemplate } from './quote-sent';
import { invoiceSentTemplate } from './invoice-sent';
import { bookingConfirmationTemplate } from './booking-confirmation';
import { accountWelcomeTemplate } from './account-welcome';
import { quoteDocumentTemplate } from './quote-document';
import { invoiceDocumentTemplate } from './invoice-document';

const DEFAULT_LIST: TemplateDefinition[] = [
  quoteDocumentTemplate,
  invoiceDocumentTemplate,
  quoteSentTemplate,
  invoiceSentTemplate,
  bookingConfirmationTemplate,
  accountWelcomeTemplate,
];

export const DEFAULT_TEMPLATES: Record<TemplateKey, TemplateDefinition> = Object.fromEntries(
  DEFAULT_LIST.map((t) => [t.key, t]),
) as Record<TemplateKey, TemplateDefinition>;

export const TEMPLATE_KEYS = DEFAULT_LIST.map((t) => t.key);

export function getDefaultTemplate(key: TemplateKey): TemplateDefinition {
  return DEFAULT_TEMPLATES[key];
}

export function isTemplateKey(key: string): key is TemplateKey {
  return Object.prototype.hasOwnProperty.call(DEFAULT_TEMPLATES, key);
}

export { DEFAULT_LIST };

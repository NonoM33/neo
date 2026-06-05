import Handlebars from 'handlebars';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { templates, type Template } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import { DEFAULT_TEMPLATES, getDefaultTemplate, isTemplateKey, DEFAULT_LIST } from './defaults';
import type { TemplateDTO, TemplateKey } from './types';

/**
 * Templates service.
 *
 * Effective template resolution: a stored row (user customisation) wins over
 * the bundled default. Rendering uses Handlebars — variables are HTML-escaped
 * by default, so client-supplied data (notes, custom messages…) is safe to
 * interpolate into the markup.
 */

// Compile cache keyed by the raw source. Editing a template produces a new
// source string, so stale entries are never served.
const compileCache = new Map<string, Handlebars.TemplateDelegate>();

function compile(source: string): Handlebars.TemplateDelegate {
  let tpl = compileCache.get(source);
  if (!tpl) {
    tpl = Handlebars.compile(source, { noEscape: false });
    compileCache.set(source, tpl);
  }
  return tpl;
}

function ensureKey(key: string): TemplateKey {
  if (!isTemplateKey(key)) {
    throw new NotFoundError('Template');
  }
  return key;
}

async function findRow(key: TemplateKey): Promise<Template | undefined> {
  const [row] = await db.select().from(templates).where(eq(templates.key, key)).limit(1);
  return row;
}

/** Effective source (html + subject) for a key: stored row or bundled default. */
async function resolveSource(key: TemplateKey): Promise<{
  html: string;
  subject: string | null;
}> {
  const row = await findRow(key);
  if (row) {
    return { html: row.html, subject: row.subject ?? null };
  }
  const def = getDefaultTemplate(key);
  return { html: def.html, subject: def.subject ?? null };
}

/** Render a template's HTML with a data context. */
export async function renderTemplateHtml(
  key: TemplateKey,
  data: Record<string, unknown>,
): Promise<string> {
  const { html } = await resolveSource(key);
  return compile(html)(data);
}

/** Render an email template into subject + html ready to send. */
export async function renderEmailTemplate(
  key: TemplateKey,
  data: Record<string, unknown>,
): Promise<{ subject: string; html: string }> {
  const { html, subject } = await resolveSource(key);
  return {
    subject: subject ? compile(subject)(data) : '',
    html: compile(html)(data),
  };
}

function toDTO(def: (typeof DEFAULT_LIST)[number], row: Template | undefined): TemplateDTO {
  return {
    key: def.key,
    kind: def.kind,
    name: def.name,
    description: def.description,
    subject: row ? row.subject ?? null : def.subject ?? null,
    html: row ? row.html : def.html,
    gjsData: row?.gjsData ?? null,
    variables: def.variables,
    customized: Boolean(row),
    updatedAt: row ? row.updatedAt.toISOString() : null,
  };
}

export async function listTemplates(): Promise<TemplateDTO[]> {
  const rows = await db.select().from(templates);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return DEFAULT_LIST.map((def) => toDTO(def, byKey.get(def.key)));
}

export async function getTemplate(key: string): Promise<TemplateDTO> {
  const k = ensureKey(key);
  const row = await findRow(k);
  return toDTO(getDefaultTemplate(k), row);
}

export interface UpdateTemplateInput {
  html: string;
  subject?: string | null;
  gjsData?: unknown;
}

export async function updateTemplate(
  key: string,
  input: UpdateTemplateInput,
): Promise<TemplateDTO> {
  const k = ensureKey(key);
  const def = getDefaultTemplate(k);

  // Documents never carry a subject; emails keep their (possibly edited) one.
  const subject = def.kind === 'email' ? input.subject ?? def.subject ?? null : null;

  const [row] = await db
    .insert(templates)
    .values({
      key: k,
      kind: def.kind,
      name: def.name,
      description: def.description,
      subject,
      html: input.html,
      gjsData: input.gjsData ?? null,
    })
    .onConflictDoUpdate({
      target: templates.key,
      set: {
        html: input.html,
        subject,
        gjsData: input.gjsData ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return toDTO(def, row);
}

/** Drop the customisation, reverting to the bundled default. */
export async function resetTemplate(key: string): Promise<TemplateDTO> {
  const k = ensureKey(key);
  await db.delete(templates).where(eq(templates.key, k));
  return toDTO(getDefaultTemplate(k), undefined);
}

/**
 * Preview a template with its sample data. If `html`/`subject` are provided
 * (unsaved editor content), they take precedence over the stored/default
 * source so the editor can preview before saving.
 */
export async function previewTemplate(
  key: string,
  override?: { html?: string; subject?: string | null },
): Promise<{ subject: string; html: string }> {
  const k = ensureKey(key);
  const def = getDefaultTemplate(k);
  const stored = await resolveSource(k);

  const html = override?.html ?? stored.html;
  const subjectSrc =
    override?.subject !== undefined ? override.subject : stored.subject;

  return {
    subject: subjectSrc ? compile(subjectSrc)(def.sampleData) : '',
    html: compile(html)(def.sampleData),
  };
}

export { DEFAULT_TEMPLATES };

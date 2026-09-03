/**
 * Mise en forme du formulaire "Nouveau devis" du back-office.
 *
 * Module pur : aucune dépendance DB/framework, donc testable seul.
 * Il ne fait QUE la structure (cible du devis, appariement des lignes) ;
 * la validation des valeurs reste celle du domaine (`createQuoteSchema`),
 * pour ne pas entretenir deux jeux de règles qui divergeraient.
 */

/** Valeur du <option> "créer un nouveau projet" dans le sélecteur de projet. */
export const NEW_PROJECT_VALUE = '__new__';

export type QuoteTarget =
  | { kind: 'project'; projectId: string }
  | { kind: 'newProject'; clientId: string; name: string };

export interface RawQuoteLine {
  productId?: string;
  description: string;
  quantity: string;
  unitPriceHT: string;
  tvaRate: string;
}

export interface RawQuoteForm {
  target: QuoteTarget;
  discount: string;
  validUntil?: string;
  notes?: string;
  lines: RawQuoteLine[];
}

/**
 * Ce que l'utilisateur a saisi, sans jugement de valeur.
 * Sert a REAFFICHER le formulaire apres une erreur : sans ca, un devis de
 * quinze lignes refuse pour un prix a zero revient vide, et la saisie est
 * a refaire entierement.
 */
export interface QuoteFormValues {
  projectId: string;
  clientId: string;
  newProjectName: string;
  discount: string;
  validUntil: string;
  notes: string;
  lines: RawQuoteLine[];
}

export type QuoteFormParseResult =
  | { ok: true; form: RawQuoteForm }
  | { ok: false; error: string };

/** Hono renvoie une chaîne pour une occurrence, un tableau pour plusieurs. */
function toStringArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((v) => (typeof v === 'string' ? v : ''));
}

function toTrimmedString(value: unknown): string {
  if (Array.isArray(value)) return toTrimmedString(value[value.length - 1]);
  return typeof value === 'string' ? value.trim() : '';
}

/** Relit le formulaire tel quel, sans rien refuser. */
export function readQuoteFormValues(body: Record<string, unknown>): QuoteFormValues {
  const descriptions = toStringArray(body.lineDescription);
  const quantities = toStringArray(body.lineQuantity);
  const prices = toStringArray(body.lineUnitPriceHT);
  const tvaRates = toStringArray(body.lineTvaRate);
  const productIds = toStringArray(body.lineProductId);

  const lines: RawQuoteLine[] = [];

  for (let i = 0; i < descriptions.length; i++) {
    const description = (descriptions[i] ?? '').trim();
    const unitPriceHT = (prices[i] ?? '').trim();
    const productId = (productIds[i] ?? '').trim();

    // Ligne laissee vide par l'utilisateur : on l'ignore au lieu de la refuser.
    if (!description && !unitPriceHT && !productId) continue;

    lines.push({
      ...(productId ? { productId } : {}),
      description,
      quantity: (quantities[i] ?? '').trim() || '1',
      unitPriceHT,
      tvaRate: (tvaRates[i] ?? '').trim() || '20',
    });
  }

  return {
    projectId: toTrimmedString(body.projectId),
    clientId: toTrimmedString(body.clientId),
    newProjectName: toTrimmedString(body.newProjectName),
    discount: toTrimmedString(body.discount) || '0',
    validUntil: toTrimmedString(body.validUntil),
    notes: toTrimmedString(body.notes),
    lines,
  };
}

export function parseQuoteForm(body: Record<string, unknown>): QuoteFormParseResult {
  const values = readQuoteFormValues(body);

  if (!values.projectId) {
    return { ok: false, error: 'Selectionnez un projet pour ce devis' };
  }

  let target: QuoteTarget;

  if (values.projectId === NEW_PROJECT_VALUE) {
    if (!values.clientId) {
      return { ok: false, error: 'Client requis pour creer un projet' };
    }
    if (!values.newProjectName) {
      return { ok: false, error: 'Nom du nouveau projet requis' };
    }

    target = { kind: 'newProject', clientId: values.clientId, name: values.newProjectName };
  } else {
    target = { kind: 'project', projectId: values.projectId };
  }

  if (values.lines.length === 0) {
    return { ok: false, error: 'Ajoutez au moins une ligne au devis' };
  }

  return {
    ok: true,
    form: {
      target,
      discount: values.discount,
      ...(values.validUntil ? { validUntil: values.validUntil } : {}),
      ...(values.notes ? { notes: values.notes } : {}),
      lines: values.lines,
    },
  };
}

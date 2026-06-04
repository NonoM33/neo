import { and, asc, eq, inArray } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db } from '../../config/database';
import { env } from '../../config/env';
import { products, configuratorDrafts } from '../../db/schema';
import { leads } from '../../db/schema/crm';
import { NotFoundError } from '../../lib/errors';
import { checkMissingDependencies } from '../products/products.service';
import { resolveDevisOwner } from '../devis/devis.service';
import {
  computeConfiguratorEstimate,
  type CatalogProduct,
  type ConfiguratorEstimate,
  type MissingDependency,
} from './configurateur.pricing';
import { buildResumeUrl, generateDraftCode, sanitizeOrigin } from './configurateur.code';
import {
  INSTALL_MODE_LABELS,
  type EstimateInput,
  type SaveInput,
  type SubmitInput,
} from './configurateur.schema';

const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export interface CatalogCategory {
  category: string;
  products: Array<{
    id: string;
    name: string;
    description: string | null;
    brand: string | null;
    priceHT: number;
    tvaRate: number;
    priceTTC: number;
    imageUrl: string | null;
  }>;
}

/** Catalogue public groupé par catégorie (produits actifs uniquement). */
export async function getConfiguratorCatalog(): Promise<CatalogCategory[]> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      brand: products.brand,
      category: products.category,
      priceHT: products.priceHT,
      tvaRate: products.tvaRate,
      imageUrl: products.imageUrl,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.category), asc(products.name));

  const byCategory = new Map<string, CatalogCategory>();
  for (const r of rows) {
    const priceHT = parseFloat(r.priceHT);
    const tvaRate = parseFloat(r.tvaRate);
    const bucket = byCategory.get(r.category) ?? { category: r.category, products: [] };
    bucket.products.push({
      id: r.id,
      name: r.name,
      description: r.description,
      brand: r.brand,
      priceHT,
      tvaRate,
      priceTTC: priceHT * (1 + tvaRate / 100),
      imageUrl: r.imageUrl,
    });
    byCategory.set(r.category, bucket);
  }

  return [...byCategory.values()];
}

/** Chiffre une sélection en résolvant les dépendances requises. */
export async function estimateConfiguration(input: EstimateInput): Promise<ConfiguratorEstimate> {
  const items = input.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
  if (items.length === 0) {
    return computeConfiguratorEstimate([], new Map(), []);
  }

  const productIds = [...new Set(items.map((i) => i.productId))];

  const [catalogRows, missing] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        priceHT: products.priceHT,
        tvaRate: products.tvaRate,
      })
      .from(products)
      .where(and(inArray(products.id, productIds), eq(products.isActive, true))),
    checkMissingDependencies(items),
  ]);

  const catalog = new Map<string, CatalogProduct>(
    catalogRows.map((p) => [
      p.id,
      { id: p.id, name: p.name, priceHT: parseFloat(p.priceHT), tvaRate: parseFloat(p.tvaRate) },
    ]),
  );

  return computeConfiguratorEstimate(items, catalog, missing as MissingDependency[]);
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateDraftCode();
    const [existing] = await db
      .select({ id: configuratorDrafts.id })
      .from(configuratorDrafts)
      .where(eq(configuratorDrafts.code, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error('Impossible de générer un code de configuration unique.');
}

export interface SavedDraft {
  code: string;
  url: string;
  qr: string; // SVG inline
  estimate: ConfiguratorEstimate;
}

/** Persiste une configuration et renvoie son code + lien de reprise + QR (SVG). */
export async function saveDraft(input: SaveInput): Promise<SavedDraft> {
  const estimate = await estimateConfiguration({ items: input.items });

  const code = await generateUniqueCode();
  await db.insert(configuratorDrafts).values({
    code,
    payload: {
      items: input.items,
      installMode: input.installMode,
      housingType: input.housingType ?? null,
      surface: input.surface ?? null,
    },
    totalTtc: estimate.totalTTC > 0 ? estimate.totalTTC.toFixed(2) : null,
  });

  const base = sanitizeOrigin(input.origin) ?? env.SITE_BASE_URL;
  const url = buildResumeUrl(base, code);
  const qr = await QRCode.toString(url, { type: 'svg', margin: 1, width: 240 });

  return { code, url, qr, estimate };
}

export interface LoadedDraft {
  code: string;
  installMode: string;
  housingType: string | null;
  surface: number | null;
  items: Array<{ productId: string; quantity: number; room?: string }>;
  estimate: ConfiguratorEstimate;
}

/** Recharge une configuration par son code et ré-estime aux prix courants. */
export async function getDraftByCode(code: string): Promise<LoadedDraft> {
  const [draft] = await db
    .select()
    .from(configuratorDrafts)
    .where(eq(configuratorDrafts.code, code.toUpperCase()))
    .limit(1);

  if (!draft) throw new NotFoundError('Configuration');

  const payload = draft.payload as {
    items?: Array<{ productId: string; quantity: number; room?: string }>;
    installMode?: string;
    housingType?: string | null;
    surface?: number | null;
  };
  const items = payload.items ?? [];
  const estimate = await estimateConfiguration({ items });

  return {
    code: draft.code,
    installMode: payload.installMode ?? 'pro',
    housingType: payload.housingType ?? null,
    surface: payload.surface ?? null,
    items,
    estimate,
  };
}

/** Résumé lisible de la configuration, destiné au champ `description` du lead. */
export function buildConfiguratorDescription(
  input: SubmitInput,
  estimate: ConfiguratorEstimate,
): string {
  const lines: string[] = ['Configuration réalisée depuis le configurateur en ligne.', ''];

  lines.push(`Pose : ${INSTALL_MODE_LABELS[input.installMode]}`);
  if (input.surface) lines.push(`Surface : ${input.surface} m²`);
  lines.push('');
  lines.push('Équipements sélectionnés :');
  for (const line of estimate.lines) {
    const suffix = line.auto ? ' (ajouté automatiquement)' : '';
    lines.push(`  • ${line.quantity}× ${line.name}${suffix} — ${EUR.format(line.totalTTC)} TTC`);
  }
  lines.push('');
  lines.push(`Total estimé : ${EUR.format(estimate.totalTTC)} TTC`);

  if (input.message) {
    lines.push('');
    lines.push(`Message : ${input.message}`);
  }

  return lines.join('\n');
}

export function buildConfiguratorLeadValues(
  input: SubmitInput,
  estimate: ConfiguratorEstimate,
  ownerId: string,
) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    title: `Configurateur en ligne — ${EUR.format(estimate.totalTTC)} TTC`,
    description: buildConfiguratorDescription(input, estimate),
    status: 'prospect' as const,
    source: 'site_web' as const,
    ownerId,
    address: input.address ?? null,
    city: input.city ?? null,
    postalCode: input.postalCode,
    surface: input.surface != null ? String(input.surface) : null,
    estimatedValue: estimate.totalTTC > 0 ? estimate.totalTTC.toFixed(2) : null,
  };
}

export async function submitConfiguration(input: SubmitInput) {
  // Honeypot : on simule un succès pour piéger les bots.
  if (input.website && input.website.length > 0) {
    return { success: true, message: 'Votre configuration a bien été enregistrée.' };
  }

  const estimate = await estimateConfiguration({ items: input.items });

  const ownerId = await resolveDevisOwner();
  if (!ownerId) {
    throw new Error('Aucun conseiller disponible pour traiter votre demande.');
  }

  const values = buildConfiguratorLeadValues(input, estimate, ownerId);
  const [lead] = await db.insert(leads).values(values).returning();
  if (!lead) {
    throw new Error('Erreur lors de l’enregistrement de votre configuration.');
  }

  // Rattache la configuration sauvegardée (si fournie) au lead créé.
  if (input.code) {
    await db
      .update(configuratorDrafts)
      .set({ leadId: lead.id, updatedAt: new Date() })
      .where(eq(configuratorDrafts.code, input.code.toUpperCase()));
  }

  return {
    success: true,
    message: 'Votre configuration a bien été enregistrée. Un conseiller vous recontacte sous 24h.',
    estimate,
  };
}

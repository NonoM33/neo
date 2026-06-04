// Pure parsing/normalization helpers for the Domadoo scraper.
// Kept side-effect free so they can be unit-tested without a browser.

export interface RawCard {
  href: string;
  title: string;
  image: string | null;
  priceText: string | null;
}

export type Protocol = 'zigbee' | 'matter';
export type MatterTransport = 'thread' | 'wifi' | 'unknown';

export interface ParsedProduct {
  reference: string;
  name: string;
  brand: string | null;
  category: string;
  description: string | null;
  imageUrl: string | null;
  supplierProductUrl: string;
  ean: string | null;
  purchasePriceHT: number; // prix Domadoo converti HT
  priceHT: number; // purchasePriceHT * (1 + margin)
  protocol: Protocol;
  isCoordinator: boolean;
  matterTransport: MatterTransport; // only meaningful when protocol === 'matter'
}

const TVA = 0.2;
export const DEFAULT_MARGIN = 0.3;

/** "29,00 €" | "1 234,50 € TTC" | "29" -> 29 / 1234.5 / 29 */
export function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  // Drop currency symbols and letters; keep digits, separators and spaces.
  let s = text.replace(/[^\d.,\s]/g, '');
  // French thousands separator is a space (incl. nbsp) -> remove between digits.
  s = s.replace(/(\d)\s+(\d)/g, '$1$2').trim();
  if (!s) return null;
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.'); // "1.234,50" -> "1234.50"
  } else {
    s = s.replace(',', '.');
  }
  const value = Number.parseFloat(s);
  return Number.isFinite(value) ? value : null;
}

/** TTC -> HT (TVA 20%), rounded to cents. */
export function htFromTtc(ttc: number, tva = TVA): number {
  return Math.round((ttc / (1 + tva)) * 100) / 100;
}

/** Apply reseller margin, rounded to cents. */
export function applyMargin(priceHT: number, margin = DEFAULT_MARGIN): number {
  return Math.round(priceHT * (1 + margin) * 100) / 100;
}

/** "REF: PIZIGATE" | "Référence PIZIGATE" -> "PIZIGATE" */
export function cleanReference(text: string | null | undefined): string | null {
  if (!text) return null;
  const ref = text.replace(/r[ée]f(?:[ée]rence)?\s*:?\s*/i, '').trim();
  return ref.length ? ref : null;
}

/** Brand is the prefix before " - " in Domadoo titles ("LIXEE - Passerelle ..."). */
export function brandFromTitle(title: string): string | null {
  const m = title.match(/^([^-–]+?)\s+[-–]\s+/);
  const raw = m?.[1]?.trim();
  if (!raw) return null;
  // Title-case an ALLCAPS brand for storage consistency.
  if (raw === raw.toUpperCase()) {
    return raw.charAt(0) + raw.slice(1).toLowerCase();
  }
  return raw;
}

/** EAN is the trailing 12-14 digit block in the product URL slug, when present. */
export function eanFromUrl(url: string): string | null {
  const m = url.match(/-(\d{12,14})\.html(?:$|[?#])/);
  return m?.[1] ?? null;
}

/** Pick the meaningful category from a PrestaShop breadcrumb (skips "Accueil", dedupes, drops the product itself). */
export function categoryFromBreadcrumb(crumbs: (string | null | undefined)[], productName?: string): string {
  const cleaned = crumbs
    .map((c) => (c ?? '').replace(/\s+/g, ' ').trim())
    .filter((c) => c.length > 0 && !/^accueil$/i.test(c));
  const deduped = cleaned.filter((c, i) => cleaned.indexOf(c) === i);
  const withoutProduct = productName ? deduped.filter((c) => c !== productName.trim()) : deduped;
  return (withoutProduct[withoutProduct.length - 1] ?? deduped[deduped.length - 1] ?? 'Zigbee').trim();
}

const COORDINATOR_RX =
  /\b(passerelle|gateway|coordinateur|coordinator|hub|bridge|box\s+domotique|dongle|cl[ée]\s+zigbee|contr[ôo]leur)\b/i;

/** Heuristic: is this product a Zigbee coordinator/gateway (i.e. a dependency target, not an end-device)? */
export function isCoordinator(name: string, category: string): boolean {
  return COORDINATOR_RX.test(name) || COORDINATOR_RX.test(category);
}

/** Detect how a Matter device connects: over Thread (needs a border router) vs over WiFi (standalone). */
export function matterTransport(text: string): MatterTransport {
  if (/over\s*thread|matter\s*thread|\bthread\b/i.test(text)) return 'thread';
  if (/over\s*wi-?fi|matter\s*wi-?fi|\bwi-?fi\b/i.test(text)) return 'wifi';
  return 'unknown';
}

/** Fallback reference from the numeric product id in the URL. */
export function slugId(url: string): string {
  const m = url.match(/\/(\d+)-/);
  return m ? `DOMADOO-${m[1]}` : url;
}

export function buildProduct(
  card: RawCard,
  detail: {
    name?: string | null;
    reference?: string | null;
    brand?: string | null;
    priceText?: string | null;
    breadcrumb?: (string | null | undefined)[];
    description?: string | null;
  },
  protocol: Protocol,
  margin = DEFAULT_MARGIN,
): ParsedProduct | null {
  const name = (detail.name || card.title || '').replace(/\s+/g, ' ').trim();
  if (!name) return null;

  const ttc = parsePrice(detail.priceText) ?? parsePrice(card.priceText);
  if (ttc == null) return null;
  const purchasePriceHT = htFromTtc(ttc);
  const priceHT = applyMargin(purchasePriceHT, margin);

  const ean = eanFromUrl(card.href);
  const reference = cleanReference(detail.reference) ?? ean ?? slugId(card.href);
  const brand = detail.brand?.trim() || brandFromTitle(name);
  const category = categoryFromBreadcrumb(detail.breadcrumb ?? [], name);
  const description = detail.description?.replace(/\s+/g, ' ').trim() || null;

  return {
    reference,
    name,
    brand: brand || null,
    category,
    description,
    imageUrl: card.image,
    supplierProductUrl: card.href,
    ean,
    purchasePriceHT,
    priceHT,
    protocol,
    isCoordinator: isCoordinator(name, category),
    matterTransport: protocol === 'matter' ? matterTransport(`${name} ${description ?? ''}`) : 'unknown',
  };
}

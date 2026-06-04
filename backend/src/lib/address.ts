/**
 * Géocodage d'adresses via la Base Adresse Nationale (BAN).
 * API publique, gratuite et sans clé : https://api-adresse.data.gouv.fr/
 *
 * Sert à vérifier qu'une adresse fournie par un visiteur est réelle et
 * complète (niveau numéro de voie) avant de planifier une visite à domicile.
 */

/** Précision d'un résultat BAN, du plus fin au plus grossier. */
export type AddressMatchType =
  | 'housenumber'
  | 'street'
  | 'locality'
  | 'municipality';

export interface AddressMatch {
  /** Libellé complet retourné par la BAN (ex. "8 Boulevard du Port 80000 Amiens"). */
  label: string;
  /** Numéro + voie (ex. "8 Boulevard du Port") ou nom de voie seul. */
  name: string;
  housenumber: string | null;
  street: string | null;
  postcode: string | null;
  city: string | null;
  /** Score de pertinence BAN entre 0 et 1. */
  score: number;
  type: AddressMatchType;
}

const BAN_SEARCH_URL = 'https://api-adresse.data.gouv.fr/search/';
const REQUEST_TIMEOUT_MS = 5000;

/** Forme minimale d'une "feature" GeoJSON renvoyée par la BAN. */
interface BanFeature {
  properties?: {
    label?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    score?: number;
    type?: string;
  };
}

interface BanResponse {
  features?: BanFeature[];
}

const VALID_TYPES: readonly AddressMatchType[] = [
  'housenumber',
  'street',
  'locality',
  'municipality',
];

function toMatchType(raw: string | undefined): AddressMatchType {
  return VALID_TYPES.includes(raw as AddressMatchType)
    ? (raw as AddressMatchType)
    : 'municipality';
}

/** Transforme une réponse BAN brute en liste typée (fonction pure, testable). */
export function parseAddressFeatures(data: unknown): AddressMatch[] {
  const features = (data as BanResponse)?.features;
  if (!Array.isArray(features)) return [];
  return features.map((f) => {
    const p = f.properties ?? {};
    return {
      label: p.label ?? '',
      name: p.name ?? p.label ?? '',
      housenumber: p.housenumber ?? null,
      street: p.street ?? null,
      postcode: p.postcode ?? null,
      city: p.city ?? null,
      score: typeof p.score === 'number' ? p.score : 0,
      type: toMatchType(p.type),
    };
  });
}

/**
 * Une adresse est exploitable pour une visite à domicile si elle est
 * géolocalisée au numéro de voie avec une bonne confiance.
 */
export function isCompleteAddress(match: AddressMatch | undefined): boolean {
  if (!match) return false;
  return match.type === 'housenumber' && match.score >= 0.5;
}

/** Interroge la BAN et renvoie les meilleures correspondances. */
export async function searchAddress(
  query: string,
  limit = 5
): Promise<AddressMatch[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = `${BAN_SEARCH_URL}?q=${encodeURIComponent(q)}&limit=${limit}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`BAN API a répondu ${res.status}`);
  }
  const data = (await res.json()) as unknown;
  return parseAddressFeatures(data);
}

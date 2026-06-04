/// <reference lib="dom" />
import { chromium as extra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContext, Page } from 'playwright';
import { buildProduct, type ParsedProduct, type Protocol, type RawCard } from './parse';

(extra as any).use(StealthPlugin());

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BASE = 'https://www.domadoo.fr/fr';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));

export async function createBrowser(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser: Browser = await (extra as any).launch({ headless: true });
  const context = await browser.newContext({ userAgent: UA, locale: 'fr-FR', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  // Establish Cloudflare clearance via the homepage first.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(2500);
  return { browser, context, page };
}

/** Navigate with retry, treating the Cloudflare "Un instant…" interstitial as a soft failure. */
async function gotoSafe(page: Page, url: string, attempts = 5): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
    await sleep(2200);
    const title = (await page.title().catch(() => '')).toLowerCase();
    if (title.length > 4 && !title.includes('instant') && !title.includes('moment')) return true;
    await sleep(jitter(5000, 8000));
  }
  return false;
}

async function extractCards(page: Page): Promise<RawCard[]> {
  return page.$$eval('article.product-miniature', (els) =>
    els.map((el) => {
      const a = (el.querySelector('h2 a, .product-title a, a[href*=".html"]') as HTMLAnchorElement | null);
      const img = el.querySelector('img') as HTMLImageElement | null;
      const price =
        el.querySelector('.price')?.textContent?.trim() ||
        el.querySelector('.product-price, [itemprop=price]')?.textContent?.trim() ||
        null;
      return {
        href: a?.href ?? '',
        title: (el.querySelector('h2, .product-title')?.textContent || '').replace(/\s+/g, ' ').trim(),
        image: img?.getAttribute('data-src') || img?.src || null,
        priceText: price,
      };
    }),
  );
}

/** Walk every listing page of a category, collecting product cards (deduped by URL). */
export async function crawlCategory(page: Page, categoryPath: string, maxPages = 30): Promise<RawCard[]> {
  const byUrl = new Map<string, RawCard>();
  for (let p = 1; p <= maxPages; p++) {
    const url = `${BASE}/${categoryPath}?page=${p}`;
    const ok = await gotoSafe(page, url);
    if (!ok) {
      console.warn(`  [listing] page ${p} blocked, skipping`);
      continue;
    }
    const cards = (await extractCards(page)).filter((c) => c.href.includes('.html'));
    let added = 0;
    for (const c of cards) {
      if (!byUrl.has(c.href)) {
        byUrl.set(c.href, c);
        added++;
      }
    }
    console.log(`  [listing] page ${p}: ${cards.length} cards (${added} new, total ${byUrl.size})`);
    if (cards.length === 0 || added === 0) break;
    await sleep(jitter(1200, 2600));
  }
  return [...byUrl.values()];
}

interface Detail {
  name: string | null;
  reference: string | null;
  brand: string | null;
  priceText: string | null;
  breadcrumb: string[];
  description: string | null;
}

async function extractDetail(page: Page): Promise<Detail> {
  return page.evaluate(() => {
    const txt = (sel: string) => document.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() || null;
    const metaPrice =
      document.querySelector('meta[property="product:price:amount"]')?.getAttribute('content') ||
      txt('.current-price-value') ||
      txt('.product-price');
    return {
      name: txt('h1'),
      reference: txt('.product-reference'),
      brand: document.querySelector('.product-manufacturer img, .manufacturer-logo img')?.getAttribute('alt') || null,
      priceText: metaPrice,
      breadcrumb: Array.from(document.querySelectorAll('.breadcrumb li, nav.breadcrumb a'))
        .map((b) => b.textContent?.replace(/\s+/g, ' ').trim() || '')
        .filter(Boolean),
      description: txt('#product-description-short, .product-description-short, [itemprop=description]'),
    };
  });
}

/** Visit one product page and merge its detail with the card to produce a normalized product. */
export async function enrichProduct(
  page: Page,
  card: RawCard,
  protocol: Protocol,
  margin?: number,
): Promise<ParsedProduct | null> {
  const ok = await gotoSafe(page, card.href);
  const detail = ok
    ? await extractDetail(page)
    : { name: null, reference: null, brand: null, priceText: null, breadcrumb: [], description: null };
  return buildProduct(card, detail, protocol, margin);
}

export const config = { BASE, sleep, jitter };

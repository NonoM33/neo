import { chromium, type Browser } from 'playwright';
import { env } from '../../config/env';

/**
 * HTML → PDF renderer backed by a single reused Chromium instance.
 *
 * In production (alpine container) Chromium is provided by the system package
 * and located via CHROMIUM_PATH. In local dev Playwright uses its downloaded
 * browser (CHROMIUM_PATH unset).
 */

let browserPromise: Promise<Browser> | null = null;

async function launch(): Promise<Browser> {
  return chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    ...(env.CHROMIUM_PATH ? { executablePath: env.CHROMIUM_PATH } : {}),
  });
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launch().catch((err) => {
      // Reset so a later call can retry instead of caching the rejection.
      browserPromise = null;
      throw err;
    });
  }
  const browser = await browserPromise;
  if (!browser.isConnected()) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

export interface HtmlToPdfOptions {
  /** Print background colours/gradients (required for our branded headers). */
  printBackground?: boolean;
}

/** Render a full HTML page to an A4 PDF. */
export async function htmlToPdf(
  html: string,
  options: HtmlToPdfOptions = {},
): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: options.printBackground ?? true,
      preferCSSPageSize: true,
    });
    return new Uint8Array(buffer);
  } finally {
    await page.close();
  }
}

/** Close the shared browser (graceful shutdown / tests). */
export async function closePdfBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    browserPromise = null;
    if (browser) await browser.close();
  }
}

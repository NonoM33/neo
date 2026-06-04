import { createBrowser, crawlCategory, enrichProduct } from './scrape';

const { browser, page } = await createBrowser();
try {
  console.log('Crawling first listing page of 206-produits-zigbee…');
  const cards = await crawlCategory(page, '206-produits-zigbee', 1);
  console.log(`Got ${cards.length} cards. Enriching 4 of them…\n`);

  for (const card of cards.slice(0, 4)) {
    const product = await enrichProduct(page, card, 'zigbee');
    if (!product) {
      console.log('!! could not parse', card.href);
      continue;
    }
    console.log('───────────────────────────────────────────');
    console.log(`name        : ${product.name}`);
    console.log(`reference   : ${product.reference}  | ean: ${product.ean ?? '—'}`);
    console.log(`brand       : ${product.brand ?? '—'}  | category: ${product.category}`);
    console.log(`coordinator?: ${product.isCoordinator}`);
    console.log(`prix Domadoo HT (achat) : ${product.purchasePriceHT.toFixed(2)} €`);
    console.log(`prix vente HT (+30%)    : ${product.priceHT.toFixed(2)} €`);
    console.log(`image       : ${product.imageUrl ?? '—'}`);
    console.log(`url         : ${product.supplierProductUrl}`);
    console.log(`desc        : ${(product.description ?? '—').slice(0, 120)}`);
  }
} finally {
  await browser.close();
}

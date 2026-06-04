import { describe, expect, test } from 'bun:test';
import {
  applyMargin,
  brandFromTitle,
  buildProduct,
  categoryFromBreadcrumb,
  cleanReference,
  eanFromUrl,
  htFromTtc,
  isCoordinator,
  matterTransport,
  parsePrice,
  slugId,
} from './parse';

describe('parsePrice', () => {
  test('FR format with euro + TTC', () => {
    expect(parsePrice('29,00 € TTC')).toBe(29);
  });
  test('thousands separator', () => {
    expect(parsePrice('1 234,50 €')).toBe(1234.5);
  });
  test('dotted thousands', () => {
    expect(parsePrice('1.234,50 €')).toBe(1234.5);
  });
  test('plain integer from meta tag', () => {
    expect(parsePrice('29')).toBe(29);
  });
  test('empty / junk', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice('Prix sur demande')).toBeNull();
  });
});

describe('htFromTtc', () => {
  test('removes 20% VAT, rounds to cents', () => {
    expect(htFromTtc(29)).toBe(24.17);
    expect(htFromTtc(120)).toBe(100);
  });
});

describe('applyMargin', () => {
  test('+30% markup rounded to cents', () => {
    expect(applyMargin(100)).toBe(130);
    expect(applyMargin(24.17)).toBe(31.42);
  });
  test('custom margin', () => {
    expect(applyMargin(100, 0.2)).toBe(120);
  });
});

describe('cleanReference', () => {
  test('strips REF: prefix', () => {
    expect(cleanReference('REF: PIZIGATE')).toBe('PIZIGATE');
    expect(cleanReference('Référence PIZIGATE')).toBe('PIZIGATE');
  });
  test('null when empty', () => {
    expect(cleanReference('REF:')).toBeNull();
    expect(cleanReference(null)).toBeNull();
  });
});

describe('brandFromTitle', () => {
  test('extracts and title-cases ALLCAPS brand prefix', () => {
    expect(brandFromTitle('LIXEE - Passerelle universelle Zigbee')).toBe('Lixee');
    expect(brandFromTitle('AQARA - Capteur de température Zigbee 3.0')).toBe('Aqara');
  });
  test('keeps mixed-case brand', () => {
    expect(brandFromTitle('Philips Hue - Ampoule E27')).toBe('Philips Hue');
  });
  test('no dash -> null', () => {
    expect(brandFromTitle('Ampoule Zigbee générique')).toBeNull();
  });
});

describe('eanFromUrl', () => {
  test('extracts trailing EAN13', () => {
    expect(
      eanFromUrl('https://www.domadoo.fr/fr/informatique/4940-lixee-passerelle-3770014375100.html'),
    ).toBe('3770014375100');
  });
  test('null when no EAN', () => {
    expect(eanFromUrl('https://www.domadoo.fr/fr/peripheriques/5245-sunricher-module-volet-roulant-zigbee-30.html')).toBeNull();
  });
});

describe('categoryFromBreadcrumb', () => {
  test('skips Accueil, dedupes, drops product name', () => {
    const crumbs = ['Accueil', 'Accueil', 'Informatique', 'Informatique', 'LIXEE - Passerelle'];
    expect(categoryFromBreadcrumb(crumbs, 'LIXEE - Passerelle')).toBe('Informatique');
  });
  test('fallback to Zigbee when empty', () => {
    expect(categoryFromBreadcrumb(['Accueil'])).toBe('Zigbee');
  });
});

describe('isCoordinator', () => {
  test('detects gateways/hubs', () => {
    expect(isCoordinator('LIXEE - Passerelle universelle Zigbee', 'Informatique')).toBe(true);
    expect(isCoordinator('SONOFF - Zigbee Bridge Pro', 'Périphériques')).toBe(true);
    expect(isCoordinator('Generic device', 'Coordinateur Zigbee')).toBe(true);
  });
  test('end-device is not a coordinator', () => {
    expect(isCoordinator('AQARA - Capteur de température', 'Thermomètre connecté')).toBe(false);
  });
});

describe('matterTransport', () => {
  test('detects Thread', () => {
    expect(matterTransport('HEIMAN - Détecteur de CO Matter over Thread')).toBe('thread');
  });
  test('detects WiFi', () => {
    expect(matterTransport('SONOFF - Prise encastrée Matter over WiFi')).toBe('wifi');
  });
  test('unknown when neither', () => {
    expect(matterTransport('Generic Matter device')).toBe('unknown');
  });
});

describe('slugId', () => {
  test('builds fallback ref from product id', () => {
    expect(slugId('https://www.domadoo.fr/fr/peripheriques/5245-sunricher-module.html')).toBe('DOMADOO-5245');
  });
});

describe('buildProduct', () => {
  const card = {
    href: 'https://www.domadoo.fr/fr/informatique/4940-lixee-passerelle-3770014375100.html',
    title: 'LIXEE - Passerelle universelle Zigbee PiZiGate+',
    image: 'https://cdn1.domadoo.fr/13881-home_default/lixee.jpg',
    priceText: '29,00 €',
  };

  test('assembles a full product with HT + margin', () => {
    const p = buildProduct(
      card,
      {
        name: 'LIXEE - Passerelle universelle Zigbee PiZiGate+ pour Rasperry Pi',
        reference: 'REF: PIZIGATE',
        brand: 'Lixee',
        priceText: '29',
        breadcrumb: ['Accueil', 'Informatique'],
        description: 'Passerelle Zigbee ouverte.',
      },
      'zigbee',
    );
    expect(p).not.toBeNull();
    expect(p!.reference).toBe('PIZIGATE');
    expect(p!.brand).toBe('Lixee');
    expect(p!.category).toBe('Informatique');
    expect(p!.ean).toBe('3770014375100');
    expect(p!.purchasePriceHT).toBe(24.17);
    expect(p!.priceHT).toBe(31.42);
    expect(p!.protocol).toBe('zigbee');
    expect(p!.isCoordinator).toBe(true);
    expect(p!.imageUrl).toBe(card.image);
  });

  test('matter over thread is tagged', () => {
    const p = buildProduct(
      { ...card, title: 'HEIMAN - Détecteur de CO Matter over Thread' },
      {},
      'matter',
    );
    expect(p!.protocol).toBe('matter');
    expect(p!.matterTransport).toBe('thread');
  });

  test('falls back to card price/title when detail missing', () => {
    const p = buildProduct(card, {}, 'zigbee');
    expect(p!.name).toBe('LIXEE - Passerelle universelle Zigbee PiZiGate+');
    expect(p!.reference).toBe('3770014375100'); // EAN fallback
    expect(p!.purchasePriceHT).toBe(24.17);
  });

  test('returns null without a price', () => {
    expect(buildProduct({ ...card, priceText: null }, {}, 'zigbee')).toBeNull();
  });
});

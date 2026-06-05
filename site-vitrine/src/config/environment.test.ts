import { describe, expect, it } from 'bun:test';
import { isStagingApiUrl } from './environment';

describe('isStagingApiUrl', () => {
  it('reconnaît l’API de recette', () => {
    expect(isStagingApiUrl('https://stg.api.neo-domotique.fr')).toBe(true);
  });

  it('reconnaît une URL de recette avec préfixe stg-', () => {
    expect(isStagingApiUrl('https://stg-api.neo.157.180.43.90.sslip.io')).toBe(true);
  });

  it('considère la prod comme non-recette', () => {
    expect(isStagingApiUrl('https://api.neo-domotique.fr')).toBe(false);
  });

  it('tolère les espaces et la casse', () => {
    expect(isStagingApiUrl('  HTTPS://STG.API.NEO-DOMOTIQUE.FR  ')).toBe(true);
  });

  it('retombe sur false pour une URL vide', () => {
    expect(isStagingApiUrl('')).toBe(false);
    expect(isStagingApiUrl(undefined)).toBe(false);
  });

  it('ne confond pas un domaine contenant « stg » au milieu d’un mot', () => {
    expect(isStagingApiUrl('https://api.costguard.fr')).toBe(false);
  });
});

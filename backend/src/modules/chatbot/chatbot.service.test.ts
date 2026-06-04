import { describe, expect, it } from 'bun:test';
import { splitFullName, buildLeadDescription } from './chatbot.service';

describe('splitFullName', () => {
  it('sépare le prénom du nom de famille', () => {
    expect(splitFullName('Jean Dupont')).toEqual({
      firstName: 'Jean',
      lastName: 'Dupont',
    });
  });

  it('regroupe les noms composés dans le nom de famille', () => {
    expect(splitFullName('Marie Anne de La Tour')).toEqual({
      firstName: 'Marie',
      lastName: 'Anne de La Tour',
    });
  });

  it('gère un prénom seul (nom de famille vide)', () => {
    expect(splitFullName('Léa')).toEqual({ firstName: 'Léa', lastName: '' });
  });

  it('ignore les espaces superflus', () => {
    expect(splitFullName('  Jean   Dupont  ')).toEqual({
      firstName: 'Jean',
      lastName: 'Dupont',
    });
  });

  it('renvoie des chaînes vides pour une entrée vide', () => {
    expect(splitFullName('   ')).toEqual({ firstName: '', lastName: '' });
  });
});

describe('buildLeadDescription', () => {
  it('inclut besoin, créneau et la source avec session', () => {
    const desc = buildLeadDescription('sess-123', {
      besoin: 'Éclairage connecté',
      creneau_souhaite: 'Mardi matin',
    });
    expect(desc).toContain('Besoin : Éclairage connecté');
    expect(desc).toContain('Créneau souhaité : Mardi matin');
    expect(desc).toContain('session sess-123');
  });

  it('omet les lignes absentes mais garde toujours la source', () => {
    const desc = buildLeadDescription('sess-9', {});
    expect(desc).not.toContain('Besoin :');
    expect(desc).not.toContain('Créneau souhaité :');
    expect(desc).toContain('Source : chatbot du site vitrine (session sess-9)');
  });

  it('garde besoin seul sans la ligne créneau', () => {
    const desc = buildLeadDescription('s', { besoin: 'Sécurité' });
    expect(desc).toContain('Besoin : Sécurité');
    expect(desc).not.toContain('Créneau souhaité :');
  });
});

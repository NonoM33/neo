import { test, expect } from 'bun:test';
import { assigneeId, assigneeLabel, categoryName } from './ticket-display';

// Régression : un ticket sans catégorie renvoie category=null côté API.
// L'ancien code faisait `ticket.category.name` → crash "Cannot read properties of null".
test('categoryName retourne — quand la catégorie est null', () => {
  expect(categoryName(null)).toBe('—');
});

test('categoryName retourne — quand le nom est null', () => {
  expect(categoryName({ id: null, name: null })).toBe('—');
});

test('categoryName retourne le nom quand présent', () => {
  expect(categoryName({ id: 'c1', name: 'Réseau' })).toBe('Réseau');
});

// Régression : assignedTo peut être null (ticket non assigné).
test('assigneeId retourne une chaîne vide quand assignedTo est null', () => {
  expect(assigneeId(null)).toBe('');
});

test('assigneeId retourne une chaîne vide quand id est null', () => {
  expect(assigneeId({ id: null, firstName: null, lastName: null })).toBe('');
});

test('assigneeId retourne l’id quand présent', () => {
  expect(assigneeId({ id: 'u1', firstName: 'Admin', lastName: 'Test' })).toBe('u1');
});

test('assigneeLabel retourne — quand assignedTo est null', () => {
  expect(assigneeLabel(null)).toBe('—');
});

test('assigneeLabel retourne — quand id est null', () => {
  expect(assigneeLabel({ id: null, firstName: 'X', lastName: 'Y' })).toBe('—');
});

test('assigneeLabel concatène prénom et nom', () => {
  expect(assigneeLabel({ id: 'u1', firstName: 'Admin', lastName: 'Test' })).toBe('Admin Test');
});

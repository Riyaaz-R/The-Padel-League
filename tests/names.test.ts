import { describe, expect, it } from 'vitest';
import { findDuplicates, fullName, isLevel, normalizeName, splitFullName, validatePlayerInput } from '@/domain/names';

describe('names', () => {
  it('builds the displayed name; a corrected name wins; single names stay single', () => {
    expect(fullName('Johan', 'Grobelaar')).toBe('Johan Grobelaar');
    expect(fullName('Karlo')).toBe('Karlo');
    expect(fullName('Karlo', null)).toBe('Karlo');
    expect(fullName('Karlo', 'Smit', 'Karlo S. Smit')).toBe('Karlo S. Smit');
  });
  it('splits full names the same way as the migration', () => {
    expect(splitFullName('Johan Grobelaar')).toEqual({ first: 'Johan', surname: 'Grobelaar' });
    expect(splitFullName('Sternie Van Staden')).toEqual({ first: 'Sternie', surname: 'Van Staden' });
    expect(splitFullName('Aboe Bakr Abrahams')).toEqual({ first: 'Aboe Bakr', surname: 'Abrahams' });
    expect(splitFullName('Karlo')).toEqual({ first: 'Karlo', surname: null });
  });
  it('detects duplicates ignoring case, spacing, punctuation and the player being edited', () => {
    const players = [{ id: '1', name: "Mo Sa'ad Patel" }, { id: '2', name: 'Karlo' }];
    expect(normalizeName("  Mo SAAD  patel ")).toBe(normalizeName("Mo Sa'ad Patel"));
    expect(findDuplicates('mo saad patel', players)).toHaveLength(1);
    expect(findDuplicates('Mo Sa’ad Patel', players, '1')).toHaveLength(0);
    expect(findDuplicates('', players)).toHaveLength(0);
    expect(findDuplicates('Someone New', players)).toHaveLength(0);
  });
  it('validates: no blank first name, level from the app set, surname optional', () => {
    expect(validatePlayerInput({ firstName: 'Karlo', division: 'high' })).toEqual([]);
    expect(validatePlayerInput({ firstName: '   ', division: 'high' })).toHaveLength(1);
    expect(validatePlayerInput({ firstName: 'A', division: 'expert' })).toHaveLength(1);
    expect(isLevel('ladies') && isLevel('high') && isLevel('low')).toBe(true);
    expect(isLevel('youth')).toBe(false);
  });
});

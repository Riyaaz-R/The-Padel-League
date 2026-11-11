import { describe, expect, it } from 'vitest';
import { cleanEmail, cleanPhone, cleanText, cleanUrl, inWindow, marqueeRepeats, marqueeSeconds, reorder, telHref } from '@/domain/sponsors';

describe('sponsor sanitising', () => {
  it('cleans text: strips control characters, collapses spaces, limits length', () => {
    expect(cleanText('  Hello\u0000\u0007   world  ', 50)).toBe('Hello world');
    expect(cleanText('a'.repeat(300), 50)).toHaveLength(50);
    expect(cleanText('Line 1\r\nLine 2\u0001', 100, { multiline: true })).toBe('Line 1\nLine 2');
    expect(cleanText(null, 10)).toBe('');
  });
  it('accepts only http(s) links', () => {
    expect(cleanUrl('')).toEqual({ ok: true, url: null });
    expect(cleanUrl('https://example.com/shop')).toEqual({ ok: true, url: 'https://example.com/shop' });
    expect(cleanUrl('example.com')).toEqual({ ok: true, url: 'https://example.com/' });
    expect(cleanUrl('http://example.co.za/a?b=1')).toMatchObject({ ok: true });
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', 'mailto:a@b.co', 'ftp://example.com', 'file:///etc/passwd', 'https://user:pw@example.com', 'not a url', 'https://']) {
      expect(cleanUrl(bad)).toMatchObject({ ok: false });
    }
  });
  it('validates emails and phone numbers', () => {
    expect(cleanEmail('hello@brand.co.za')).toEqual({ ok: true, email: 'hello@brand.co.za' });
    expect(cleanEmail('nope')).toMatchObject({ ok: false });
    expect(cleanEmail('')).toEqual({ ok: true, email: null });
    expect(cleanPhone('+27 41 123 4567')).toMatchObject({ ok: true });
    expect(cleanPhone('abc')).toMatchObject({ ok: false });
    expect(cleanPhone('12')).toMatchObject({ ok: false });
    expect(telHref('+27 (41) 123-4567')).toBe('tel:+27411234567');
  });
});

describe('banner timing', () => {
  it('checks the optional date window, inclusive', () => {
    expect(inWindow(null, null, '2026-11-13')).toBe(true);
    expect(inWindow('2026-11-13', '2026-12-18', '2026-11-13')).toBe(true);
    expect(inWindow('2026-11-13', '2026-12-18', '2026-12-18')).toBe(true);
    expect(inWindow('2026-11-14', null, '2026-11-13')).toBe(false);
    expect(inWindow(null, '2026-11-12', '2026-11-13')).toBe(false);
  });
  it('repeats items enough for a seamless loop and scales speed', () => {
    expect(marqueeRepeats(0)).toBe(0);
    expect(marqueeRepeats(1)).toBeGreaterThan(marqueeRepeats(10));
    expect(marqueeRepeats(20)).toBe(1);
    expect(marqueeSeconds(3, 'fast', 2)).toBeLessThan(marqueeSeconds(3, 'slow', 2));
    expect(marqueeSeconds(1, 'fast', 1)).toBeGreaterThanOrEqual(12);
  });
  it('reorders by moving one item up or down', () => {
    const l = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(reorder(l, 'b', -1)?.map((x) => x.id)).toEqual(['b', 'a', 'c']);
    expect(reorder(l, 'b', 1)?.map((x) => x.id)).toEqual(['a', 'c', 'b']);
    expect(reorder(l, 'a', -1)).toBeNull();
    expect(reorder(l, 'c', 1)).toBeNull();
    expect(reorder(l, 'zzz', 1)).toBeNull();
  });
});

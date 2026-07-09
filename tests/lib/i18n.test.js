import { describe, it, expect } from 'vitest';
import { baseUiText, makeT } from '../../lib/i18n.js';

describe('baseUiText', () => {
  it('has en, cs, it keys', () => {
    expect(baseUiText).toHaveProperty('en');
    expect(baseUiText).toHaveProperty('cs');
    expect(baseUiText).toHaveProperty('it');
  });

  it('has the same keys in all three languages', () => {
    const enKeys = Object.keys(baseUiText.en).sort();
    const csKeys = Object.keys(baseUiText.cs).sort();
    const itKeys = Object.keys(baseUiText.it).sort();
    expect(csKeys).toEqual(enKeys);
    expect(itKeys).toEqual(enKeys);
  });
});

describe('makeT', () => {
  const dict = {
    en: { hello: 'Hello', greeting: 'Hello {name}!' },
    cs: { hello: 'Ahoj' },
  };

  it('returns translation in current language', () => {
    const { t } = makeT(dict, () => 'cs');
    expect(t('hello')).toBe('Ahoj');
  });

  it('falls back to English when key missing from current lang', () => {
    const { t } = makeT(dict, () => 'cs');
    expect(t('greeting')).toBe('Hello {name}!');
  });

  it('falls back to English when lang entirely missing from dictionary', () => {
    const { t } = makeT(dict, () => 'fr');
    expect(t('hello')).toBe('Hello');
  });

  it('returns the key string when missing from all languages', () => {
    const { t } = makeT(dict, () => 'en');
    expect(t('nonexistent')).toBe('nonexistent');
  });

  it('tf substitutes a single placeholder', () => {
    const { tf } = makeT(dict, () => 'en');
    expect(tf('greeting', { name: 'World' })).toBe('Hello World!');
  });

  it('tf substitutes multiple placeholders', () => {
    const dict2 = {
      en: { msg: '{a} and {b} went to {c}' },
    };
    const { tf } = makeT(dict2, () => 'en');
    expect(tf('msg', { a: 'Alice', b: 'Bob', c: 'Paris' }))
      .toBe('Alice and Bob went to Paris');
  });

  it('tf leaves unmatched placeholders as-is', () => {
    const { tf } = makeT(dict, () => 'en');
    expect(tf('greeting', {})).toBe('Hello {name}!');
  });

  it('tf returns key string when key missing', () => {
    const { tf } = makeT(dict, () => 'en');
    expect(tf('nonexistent', { x: 'y' })).toBe('nonexistent');
  });
});
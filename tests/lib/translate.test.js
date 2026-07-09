import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureTranslated, getText } from '../../lib/translate.js';

describe('getText', () => {
  it('returns translated fields on cache hit', () => {
    const cache = { cs: { 1: { short_name: 'Ahoj', description: 'Svět', fun_fact: 'Zajímavost' } } };
    const result = getText({ id: 1, short_name: 'Hello', description: 'World' }, cache, 'cs');
    expect(result.short_name).toBe('Ahoj');
    expect(result.description).toBe('Svět');
    expect(result.fun_fact).toBe('Zajímavost');
  });

  it('falls back to event fields on cache miss', () => {
    const cache = { cs: {} };
    const result = getText({ id: 2, short_name: 'Hello', description: 'World' }, cache, 'cs');
    expect(result.short_name).toBe('Hello');
    expect(result.description).toBe('World');
    expect(result.fun_fact).toBe('');
  });

  it('falls back to ??? when event has no short_name and cache misses', () => {
    const cache = { cs: {} };
    const result = getText({ id: 3 }, cache, 'cs');
    expect(result.short_name).toBe('???');
    expect(result.description).toBe('');
  });

  it('falls back to empty string when event has no description and cache misses', () => {
    const cache = { cs: {} };
    const result = getText({ id: 3, short_name: 'Test' }, cache, 'cs');
    expect(result.description).toBe('');
  });

  it('handles cache[lang] being undefined', () => {
    const cache = {};
    const result = getText({ id: 1, short_name: 'Hello', description: 'World' }, cache, 'fr');
    expect(result.short_name).toBe('Hello');
    expect(result.description).toBe('World');
  });

  it('falls back to event fields when translation short_name is null', () => {
    const cache = { cs: { 1: { short_name: null, description: 'Svět' } } };
    const result = getText({ id: 1, short_name: 'Hello', description: 'World' }, cache, 'cs');
    expect(result.short_name).toBe('Hello');
    expect(result.description).toBe('Svět');
  });
});

describe('ensureTranslated', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('is a no-op when lang is "en"', async () => {
    const cache = {};
    await ensureTranslated([{ id: 1, short_name: 'Hello' }], cache, 'en');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not fetch when all events are already cached', async () => {
    const cache = { cs: { 1: { short_name: 'Ahoj' } } };
    await ensureTranslated([{ id: 1, short_name: 'Hello' }], cache, 'cs');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches missing translations', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ '1': { short_name: 'Ahoj', description: 'Svět' } }),
    });
    const cache = { cs: {} };
    await ensureTranslated([{ id: 1, short_name: 'Hello' }], cache, 'cs');
    expect(global.fetch).toHaveBeenCalledWith('/api/translate?ids=1&lang=cs');
    expect(cache.cs[1].short_name).toBe('Ahoj');
  });

  it('fetches only missing events, not cached ones', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ '2': { short_name: 'B' } }),
    });
    const cache = { cs: { 1: { short_name: 'A' } } };
    await ensureTranslated([
      { id: 1, short_name: 'A' },
      { id: 2, short_name: 'B' },
    ], cache, 'cs');
    expect(global.fetch).toHaveBeenCalledWith('/api/translate?ids=2&lang=cs');
  });

  it('handles fetch failure gracefully (no throw)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const cache = { cs: {} };
    await expect(
      ensureTranslated([{ id: 1, short_name: 'Hello' }], cache, 'cs')
    ).resolves.toBeUndefined();
  });

  it('handles non-ok response gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const cache = { cs: {} };
    await ensureTranslated([{ id: 1, short_name: 'Hello' }], cache, 'cs');
    expect(cache.cs[1]).toBeUndefined();
  });

  it('creates cache[lang] if it does not exist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ '1': { short_name: 'Ahoj' } }),
    });
    const cache = {};
    await ensureTranslated([{ id: 1, short_name: 'Hello' }], cache, 'cs');
    expect(cache.cs).toBeDefined();
    expect(cache.cs[1].short_name).toBe('Ahoj');
  });

  it('skips null/undefined events', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ '1': { short_name: 'Ahoj' } }),
    });
    const cache = { cs: {} };
    await ensureTranslated([null, undefined, { id: 1, short_name: 'Hello' }], cache, 'cs');
    expect(global.fetch).toHaveBeenCalledWith('/api/translate?ids=1&lang=cs');
  });
});
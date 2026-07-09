import { describe, it, expect, vi } from 'vitest';
import { onCardKey } from '../../lib/onCardKey.js';

describe('onCardKey', () => {
  it('calls handler on Enter key', () => {
    const handler = vi.fn();
    const fn = onCardKey(handler);
    const event = { key: 'Enter', preventDefault: vi.fn() };
    fn(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('calls handler on Space key', () => {
    const handler = vi.fn();
    const fn = onCardKey(handler);
    const event = { key: ' ', preventDefault: vi.fn() };
    fn(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('calls handler on legacy "Spacebar" key', () => {
    const handler = vi.fn();
    const fn = onCardKey(handler);
    const event = { key: 'Spacebar', preventDefault: vi.fn() };
    fn(event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call handler on other keys', () => {
    const handler = vi.fn();
    const fn = onCardKey(handler);
    const event = { key: 'a', preventDefault: vi.fn() };
    fn(event);
    expect(handler).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('does not call handler on Tab key', () => {
    const handler = vi.fn();
    const fn = onCardKey(handler);
    fn({ key: 'Tab', preventDefault: vi.fn() });
    expect(handler).not.toHaveBeenCalled();
  });
});
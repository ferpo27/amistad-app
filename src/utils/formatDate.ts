// src/utils/formatDate.ts
export function formatDate(date: Date, locale?: string): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return formatter.format(date);
}

// src/utils/__tests__/formatDate.test.ts
import { formatDate } from '../../utils/formatDate';

describe('formatDate', () => {
  it('formats a date using the provided locale', () => {
    const date = new Date('2023-01-15T00:00:00Z');
    const formatted = formatDate(date, 'en-US');
    expect(formatted).toBe('Jan 15, 2023');
  });

  it('defaults to the runtime locale when none is provided', () => {
    const date = new Date('2023-01-15T00:00:00Z');
    const formatted = formatDate(date);
    // The exact output depends on the environment's default locale.
    // Ensure it returns a non‑empty string.
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
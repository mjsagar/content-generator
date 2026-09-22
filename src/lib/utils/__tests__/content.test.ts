import { describe, it, expect, vi } from 'vitest';
import { getCleanSnippet } from '../content';

// Mock getTopicFallbackImage to avoid network calls or complex logic in sanitizeHtml
vi.mock('@/lib/services/image', () => ({
  getTopicFallbackImage: vi.fn(() => 'fallback.jpg'),
}));

describe('getCleanSnippet', () => {
  it('returns empty string for empty input', () => {
    expect(getCleanSnippet('')).toBe('');
    // @ts-expect-error testing invalid input
    expect(getCleanSnippet(null)).toBe('');
    // @ts-expect-error testing invalid input
    expect(getCleanSnippet(undefined)).toBe('');
  });

  it('returns plain text unchanged if under max length', () => {
    const text = 'This is a simple text.';
    expect(getCleanSnippet(text)).toBe(text);
  });

  it('strips HTML tags and returns clean text', () => {
    const html = '<p>This is <b>bold</b> and <i>italic</i>.</p>';
    expect(getCleanSnippet(html)).toBe('This is bold and italic .');
  });

  it('adds spaces when stripping adjacent block elements', () => {
    const html = '<div>Hello</div><div>World</div>';
    expect(getCleanSnippet(html)).toBe('Hello World');
  });

  it('collapses multiple spaces, newlines, and tabs', () => {
    const text = 'This    has \n\n multiple \t spaces.';
    expect(getCleanSnippet(text)).toBe('This has multiple spaces.');
  });

  it('handles content exactly at maximum length', () => {
    const text = 'a'.repeat(180);
    expect(getCleanSnippet(text, 180)).toBe(text);
  });

  it('truncates content longer than maximum length and appends ...', () => {
    const text = 'a'.repeat(200);
    const expected = 'a'.repeat(180) + '...';
    expect(getCleanSnippet(text)).toBe(expected);
  });

  it('allows custom maximum length override', () => {
    const text = 'This is a somewhat long sentence.';
    expect(getCleanSnippet(text, 10)).toBe('This is a...');
  });

  it('strips markdown code fences if present', () => {
      const html = '```html\n<p>Some text</p>\n```';
      expect(getCleanSnippet(html)).toBe('Some text');
  });

  it('handles double escaped quotes from HTML tags (though tags are stripped)', () => {
      const html = '<a href=\\"https://example.com\\">Link</a>';
      expect(getCleanSnippet(html)).toBe('Link');
  });
});

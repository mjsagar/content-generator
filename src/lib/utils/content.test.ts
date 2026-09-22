import { describe, it, expect, vi } from 'vitest';
import { sanitizeHtml, getCleanSnippet } from './content';
import * as imageService from '@/lib/services/image';

// Mock the image service so tests are deterministic
vi.mock('@/lib/services/image', () => ({
  getTopicFallbackImage: vi.fn((title, type) => `https://mock-image.com/${title}-${type || 'none'}.jpg`),
}));

describe('sanitizeHtml', () => {
  it('returns empty string for null or empty input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null as unknown as string)).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
  });

  it('removes markdown code fences', () => {
    const input = '```html\n<p>Hello World</p>\n```';
    expect(sanitizeHtml(input)).toBe('<p>Hello World</p>');

    const input2 = '```\n<p>Hello World</p>\n```';
    expect(sanitizeHtml(input2)).toBe('<p>Hello World</p>');
  });

  it('fixes double-escaped quotes', () => {
    const input = '<img src=\\"test.jpg\\" alt=\\\'test\\\' />';
    const result = sanitizeHtml(input);
    expect(result).toContain('src="test.jpg"');
    expect(result).toContain("alt='test'");
  });

  it('converts literal backslash sequences to whitespace and newlines', () => {
    const input = 'Line 1\\nLine 2\\r\\nLine 3\\tTabbed';
    expect(sanitizeHtml(input)).toBe('Line 1\nLine 2\nLine 3 Tabbed');
  });

  it('removes empty paragraphs', () => {
    const input = '<p>Content</p><p></p><p>  </p>';
    expect(sanitizeHtml(input)).toBe('<p>Content</p>');
  });

  it('replaces deprecated unsplash URLs', () => {
    const input = '<img src="https://source.unsplash.com/800x400/?technology" alt="tech" />';
    const result = sanitizeHtml(input, 'Tech Title');
    expect(result).toContain('https://mock-image.com/technology-none.jpg');
    // Ensure the old URL is gone
    expect(result).not.toContain('source.unsplash.com');
  });

  it('adds complete styling and onerror fallback to unstyled img tags', () => {
    const input = '<img src="test.jpg" alt="test" />';
    const result = sanitizeHtml(input);
    expect(result).toContain('class="w-full h-auto rounded-2xl shadow-lg mb-8"');
    expect(result).toContain('onerror="this.onerror=null;this.src=\'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&h=675&q=80\'"');
  });

  it('modifies existing img classes and removes forced aspect ratios', () => {
    const input = '<img class="h-64 aspect-[16/9] object-cover custom-class" src="test.jpg" />';
    const result = sanitizeHtml(input);

    // Should remove cropping classes
    expect(result).not.toContain('h-64');
    expect(result).not.toContain('aspect-[16/9]');
    expect(result).not.toContain('object-cover');

    // Should keep custom class and add required classes
    expect(result).toContain('custom-class');
    expect(result).toContain('rounded-2xl');
    expect(result).toContain('w-full');
    expect(result).toContain('shadow-lg');
    expect(result).toContain('mb-8');
    expect(result).toContain('h-auto');
  });

  it('does not add onerror fallback if it already exists', () => {
    const input = '<img src="test.jpg" onerror="customFallback()" />';
    const result = sanitizeHtml(input);
    expect(result).toContain('onerror="customFallback()"');
    expect(result).not.toContain('this.onerror=null');
  });

  it('prepends fallback image when no image exists and title is provided', () => {
    const input = '<p>Just some text</p>';
    const result = sanitizeHtml(input, 'My Title', 'tech');

    expect(result).toMatch(/^<img src="https:\/\/mock-image\.com\/My Title-tech\.jpg" alt="My Title"/);
    expect(result).toContain('class="w-full h-auto rounded-2xl shadow-lg mb-8"');
    expect(result).toContain('<p>Just some text</p>');
  });

  it('does not prepend fallback image if an image already exists', () => {
    const input = '<img src="existing.jpg" alt="exist" /><p>Text</p>';
    const result = sanitizeHtml(input, 'My Title', 'tech');

    // Because the fallbackImg is now a mocked URL when a title is present,
    // the onerror handler of the existing image will contain the mocked URL.
    // However, the function should NOT have PREPENDED a new img tag to the content.
    // We can verify this by checking that it still starts with the existing img tag (with updated classes).
    expect(result.startsWith('<img ')).toBe(true);
    expect(result).toContain('src="existing.jpg"');

    // Check that we only have one img tag in the result
    const imgTagCount = (result.match(/<img /g) || []).length;
    expect(imgTagCount).toBe(1);
  });
});

describe('getCleanSnippet', () => {
  it('strips HTML tags and normalizes whitespace', () => {
    const input = '<h1>Title</h1>\n<p>This is a <b>test</b> snippet.</p>\t<p>More text.</p>';
    const result = getCleanSnippet(input);
    expect(result).toBe('Title This is a test snippet. More text.');
  });

  it('truncates text to maxLength and adds ellipsis', () => {
    const input = '<p>This is a very long string that should be truncated because it exceeds the maximum length allowed for a snippet.</p>';
    const result = getCleanSnippet(input, 50);
    expect(result).toBe('This is a very long string that should be truncate...');
    expect(result.length).toBe(53); // 50 chars + 3 for '...'
  });

  it('does not truncate if under maxLength', () => {
    const input = '<p>Short string</p>';
    const result = getCleanSnippet(input, 50);
    expect(result).toBe('Short string');
  });

  it('returns empty string for null or empty input', () => {
    expect(getCleanSnippet('')).toBe('');
    expect(getCleanSnippet(null as unknown as string)).toBe('');
  });
});

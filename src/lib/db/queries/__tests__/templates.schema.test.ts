import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

const templateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
});

function sanitizeContent(html: string): string {
  return DOMPurify.sanitize(html);
}

describe('templates schema', () => {
  it('requires title', () => {
    const result = templateSchema.safeParse({
      title: '',
      slug: 'test',
      content: '',
      category: '',
      tags: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Title is required');
    }
  });

  it('validates valid template', () => {
    const result = templateSchema.safeParse({
      title: 'Test Template',
      slug: 'test-template',
      content: '# Test',
      category: 'test',
      tags: ['tag1', 'tag2'],
    });
    expect(result.success).toBe(true);
  });

  it('sanitizes content by default', () => {
    const malicious = '<script>alert("xss")</script><p>Safe content</p>';
    const sanitized = sanitizeContent(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Safe content');
  });

  it('preserves safe HTML', () => {
    const safe = '<p>Safe content</p><strong>Bold</strong>';
    const sanitized = sanitizeContent(safe);
    expect(sanitized).toContain('Safe content');
  });
});




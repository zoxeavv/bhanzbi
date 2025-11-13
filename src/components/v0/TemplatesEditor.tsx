'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

const templateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
});

interface TemplatesEditorProps {
  template?: {
    id: string;
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
  };
  onSave: (data: {
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
  }) => Promise<void>;
}

export function TemplatesEditor({ template, onSave }: TemplatesEditorProps) {
  const [title, setTitle] = useState(template?.title ?? '');
  const [slug, setSlug] = useState(template?.slug ?? '');
  const [content, setContent] = useState(template?.content ?? '');
  const [category, setCategory] = useState(template?.category ?? '');
  const [tags, setTags] = useState<string[]>(template?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Generate slug from title if empty
  useEffect(() => {
    if (!slug && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  }, [title, slug]);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const sanitizeContent = (html: string): string => {
    return DOMPurify.sanitize(html);
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!slug.trim()) {
      newErrors.slug = 'Slug is required';
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim(),
        category: category.trim(),
        tags,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sanitizedPreview = sanitizeContent(content);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Template title"
            className="w-full px-3 py-2 border rounded-md"
          />
          {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Slug *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="template-slug"
            className="w-full px-3 py-2 border rounded-md"
          />
          {errors.slug && <p className="text-sm text-destructive mt-1">{errors.slug}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add tag"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            onClick={addTag}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm flex items-center gap-1"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Markdown Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Markdown content"
            className="w-full px-3 py-2 border rounded-md min-h-[400px] font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Preview</label>
          <div
            className="w-full px-3 py-2 border rounded-md min-h-[400px] bg-muted"
            dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

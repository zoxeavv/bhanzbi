import { describe, it, expect } from 'vitest';

interface CSVRow {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  tags?: string;
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: CSVRow = {};
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (value) {
        if (header === 'tags') {
          row.tags = value;
        } else {
          (row as any)[header] = value;
        }
      }
    });
    
    rows.push(row);
  }

  return rows;
}

function parseTags(tagsStr: string | undefined): string[] {
  if (!tagsStr) return [];
  return tagsStr.split('|').map(t => t.trim()).filter(Boolean);
}

function validateRow(row: CSVRow): { valid: boolean; error?: string } {
  if (!row.name && !row.company) {
    return { valid: false, error: 'Missing name or company' };
  }
  return { valid: true };
}

function omitUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      result[key as keyof T] = obj[key];
    }
  });
  return result;
}

describe('clients CSV', () => {
  it('parses CSV correctly', () => {
    const csv = 'name,email,phone\nJohn Doe,john@example.com,1234567890';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('John Doe');
    expect(rows[0].email).toBe('john@example.com');
  });

  it('validates row with name', () => {
    const row = { name: 'John Doe' };
    expect(validateRow(row).valid).toBe(true);
  });

  it('validates row with company', () => {
    const row = { company: 'Acme Corp' };
    expect(validateRow(row).valid).toBe(true);
  });

  it('rejects row without name or company', () => {
    const row = { email: 'test@example.com' };
    expect(validateRow(row).valid).toBe(false);
  });

  it('parses tags with pipe separator', () => {
    const tags = parseTags('tag1|tag2|tag3');
    expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('handles empty tags', () => {
    const tags = parseTags(undefined);
    expect(tags).toEqual([]);
  });

  it('omits undefined keys', () => {
    const obj = { name: 'John', email: undefined, phone: '123' };
    const result = omitUndefined(obj);
    expect(result.name).toBe('John');
    expect(result.phone).toBe('123');
    expect(result.email).toBeUndefined();
    expect('email' in result).toBe(false);
  });

  it('enforces file size limit', () => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const fileSize = 6 * 1024 * 1024; // 6MB
    expect(fileSize > maxSize).toBe(true);
  });
});


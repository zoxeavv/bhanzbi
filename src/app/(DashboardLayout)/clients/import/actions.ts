'use server';

import { createClient } from '@/lib/db/queries/clients';

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

export async function importClientsFromCSV(file: File): Promise<void> {
  try {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    const text = await file.text();
    const rows = parseCSV(text);

    const validRows: Array<{ name: string; company?: string; email?: string; phone?: string; tags?: string[] }> = [];
    const invalidRows: Array<{ row: number; error: string }> = [];

    rows.forEach((row, index) => {
      if (!row.name && !row.company) {
        invalidRows.push({ row: index + 2, error: 'Missing name or company' });
        return;
      }

      validRows.push({
        name: row.name || row.company || '',
        company: row.company || '',
        email: row.email || '',
        phone: row.phone || '',
        tags: parseTags(row.tags),
      });
    });

    // Create clients in transaction (chunked for large imports)
    const chunkSize = 100;
    for (let i = 0; i < validRows.length; i += chunkSize) {
      const chunk = validRows.slice(i, i + chunkSize);
      await Promise.all(chunk.map(row => createClient(row)));
    }

    return {
      success: true,
      imported: validRows.length,
      errors: invalidRows.length,
      errorRows: invalidRows,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: 0,
      errorRows: [],
      message: error instanceof Error ? error.message : 'Failed to import clients',
    };
  }
}


import { describe, it, expect } from 'vitest';

function calculateTotals(items: Array<{ total: number }>, taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

describe('offers totals', () => {
  it('calculates subtotal correctly in centimes', () => {
    const items = [
      { total: 10000 }, // €100.00
      { total: 5000 },  // €50.00
    ];
    const { subtotal } = calculateTotals(items, 0);
    expect(subtotal).toBe(15000); // €150.00
  });

  it('calculates tax correctly in centimes', () => {
    const items = [{ total: 10000 }]; // €100.00
    const { taxAmount } = calculateTotals(items, 20); // 20% tax
    expect(taxAmount).toBe(2000); // €20.00
  });

  it('calculates total correctly in centimes', () => {
    const items = [{ total: 10000 }]; // €100.00
    const { total } = calculateTotals(items, 20); // 20% tax
    expect(total).toBe(12000); // €120.00
  });

  it('handles zero tax rate', () => {
    const items = [{ total: 10000 }];
    const { taxAmount, total } = calculateTotals(items, 0);
    expect(taxAmount).toBe(0);
    expect(total).toBe(10000);
  });

  it('handles tax rate >= 0', () => {
    const items = [{ total: 10000 }];
    const { taxAmount } = calculateTotals(items, 0);
    expect(taxAmount).toBeGreaterThanOrEqual(0);
  });
});



import { describe, it, expect } from 'vitest';
import {
  calculateRemainingChickens,
  calculateTotalChickenCount,
  calculateBoxSetWeights,
  validateRecordDate,
  calculateDayOfBatch,
  deductFeedStock,
  generateBatchNumber,
  generateBatchName
} from './calculations';

describe('Calculations Utility Tests', () => {
  describe('calculateRemainingChickens', () => {
    it('correctly subtracts mortality from previous remaining count', () => {
      expect(calculateRemainingChickens(1000, 15)).toBe(985);
    });

    it('throws error when mortality count is negative', () => {
      expect(() => calculateRemainingChickens(1000, -5)).toThrow('Mortality count cannot be negative.');
    });

    it('throws error when mortality count exceeds remaining chicken count', () => {
      expect(() => calculateRemainingChickens(500, 501)).toThrow(/cannot exceed remaining chicken count/);
    });
  });

  describe('calculateTotalChickenCount', () => {
    it('calculates box count * count per box', () => {
      expect(calculateTotalChickenCount(50, 10)).toBe(500);
      expect(calculateTotalChickenCount(0, 10)).toBe(0);
    });
  });

  describe('calculateBoxSetWeights', () => {
    it('calculates total weight and average weight with default 5kg empty box', () => {
      const result = calculateBoxSetWeights(25, 5, 10);
      expect(result.totalChickenWeight).toBe(20);
      expect(result.averageChickenWeight).toBe(2);
    });

    it('handles custom empty box weight', () => {
      const result = calculateBoxSetWeights(24, 4, 10);
      expect(result.totalChickenWeight).toBe(20);
      expect(result.averageChickenWeight).toBe(2);
    });
  });

  describe('validateRecordDate', () => {
    it('accepts valid dates between arrival date and today', () => {
      const res = validateRecordDate('2026-09-10', '2026-09-01', '2026-09-13');
      expect(res.valid).toBe(true);
    });

    it('rejects dates prior to arrival date', () => {
      const res = validateRecordDate('2026-08-30', '2026-09-01', '2026-09-13');
      expect(res.valid).toBe(false);
      expect(res.message).toContain('cannot be earlier than chick arrival date');
    });

    it('rejects future dates', () => {
      const res = validateRecordDate('2026-09-15', '2026-09-01', '2026-09-13');
      expect(res.valid).toBe(false);
      expect(res.message).toBe('Future dates are not allowed.');
    });
  });

  describe('calculateDayOfBatch', () => {
    it('calculates 1-based day index correctly', () => {
      expect(calculateDayOfBatch('2026-09-01', '2026-09-01')).toBe(1);
      expect(calculateDayOfBatch('2026-09-01', '2026-09-07')).toBe(7);
    });
  });

  describe('deductFeedStock (FIFO Deduction Order)', () => {
    it('deducts in order: Pre-Starter -> Starter -> Finisher', () => {
      const stock = {
        'Pre-Starter': 50,
        'Starter': 100,
        'Finisher': 150
      };

      // Deduct 75kg without specifying type
      const res = deductFeedStock(stock, null, 75);
      expect(res.deductedByType['Pre-Starter']).toBe(50);
      expect(res.deductedByType['Starter']).toBe(25);
      expect(res.deductedByType['Finisher']).toBe(0);
      expect(res.updatedStock['Pre-Starter']).toBe(0);
      expect(res.updatedStock['Starter']).toBe(75);
      expect(res.updatedStock['Finisher']).toBe(150);
    });

    it('spills over deduction from Pre-Starter into Starter when Pre-Starter is exhausted', () => {
      const stock = {
        'Pre-Starter': 70, // 1 Bag
        'Starter': 350,   // 5 Bags
        'Finisher': 0
      };

      // Deduct 3 Bags = 210kg
      const res = deductFeedStock(stock, null, 210);
      expect(res.updatedStock['Pre-Starter']).toBe(0);   // 0 Bags
      expect(res.updatedStock['Starter']).toBe(210);      // 3 Bags (210kg / 70kg per bag)
      expect(res.updatedStock['Finisher']).toBe(0);
    });
  });

  describe('Batch ID and Name generators', () => {
    it('generates formatted batch IDs and names', () => {
      expect(generateBatchNumber(0)).toBe('KG001');
      expect(generateBatchNumber(9)).toBe('KG010');
      expect(generateBatchName(0)).toBe('KgPoultryBatch-1');
      expect(generateBatchName(9)).toBe('KgPoultryBatch-10');
    });
  });
});

const BudgetService = require('../js/budget');

describe('BudgetService', () => {
  beforeEach(() => {
    BudgetService.clearCache();
  });

  describe('getFeasibility', () => {
    test('returns green when cost is <= 90% of budget', () => {
      expect(BudgetService.getFeasibility(90, 100)).toBe('green');
      expect(BudgetService.getFeasibility(50, 100)).toBe('green');
    });

    test('returns yellow when cost is between 90% and 110% of budget', () => {
      expect(BudgetService.getFeasibility(91, 100)).toBe('yellow');
      expect(BudgetService.getFeasibility(100, 100)).toBe('yellow');
      expect(BudgetService.getFeasibility(110, 100)).toBe('yellow');
    });

    test('returns red when cost is > 110% of budget', () => {
      expect(BudgetService.getFeasibility(111, 100)).toBe('red');
      expect(BudgetService.getFeasibility(150, 100)).toBe('red');
    });

    test('returns yellow if budget is 0 or negative', () => {
      expect(BudgetService.getFeasibility(50, 0)).toBe('yellow');
      expect(BudgetService.getFeasibility(50, -10)).toBe('yellow');
    });
  });

  describe('computeGroceryTotals', () => {
    test('computes total and categorises correctly', () => {
      const list = [
        { category: 'Produce', estimatedCost: 5 },
        { category: 'Produce', estimatedCost: 2.5 },
        { category: 'Protein', estimatedCost: 10 },
        { estimatedCost: 3 } // no category -> 'Other'
      ];
      
      const result = BudgetService.computeGroceryTotals(list);
      expect(result.total).toBe(20.5);
      expect(result.byCategory).toEqual({
        'Produce': 7.5,
        'Protein': 10,
        'Other': 3
      });
    });

    test('uses cache on identical JSON string', () => {
      const list = [{ category: 'Dairy', estimatedCost: 5 }];
      const result1 = BudgetService.computeGroceryTotals(list);
      const result2 = BudgetService.computeGroceryTotals(list);
      expect(result1).toBe(result2); // Exact same object reference
    });
  });

  describe('buildSummary', () => {
    test('builds accurate summary object', () => {
      const analysis = {
        totalEstimatedCost: 95,
        costPerPerson: 47.5,
        breakdown: { breakfast: 20, lunch: 30, dinner: 45 },
        savingTips: ['Buy bulk']
      };
      const summary = BudgetService.buildSummary(analysis, 100);
      
      expect(summary.cost).toBe(95);
      expect(summary.perPerson).toBe(47.5);
      expect(summary.saved).toBe(5);
      expect(summary.barPct).toBe(95);
      expect(summary.feasibility).toBe('yellow');
      expect(summary.badgeCss).toBe('feasibility-yellow');
      expect(summary.savingTips).toEqual(['Buy bulk']);
    });
  });
});

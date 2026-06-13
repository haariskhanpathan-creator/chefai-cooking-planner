const GroceryService = require('../js/grocery');

describe('GroceryService', () => {
  describe('toPlainText', () => {
    test('formats grocery list as plain text correctly', () => {
      const items = [
        { category: 'Produce', item: 'Apple', quantity: 2, unit: 'pcs', estimatedCost: 3 },
        { category: 'Dairy', item: 'Milk', quantity: 1, unit: 'L', estimatedCost: 2 }
      ];
      
      const text = GroceryService.toPlainText(items, 'Test Plan');
      expect(text).toContain('Grocery List – Test Plan');
      expect(text).toContain('PRODUCE');
      expect(text).toContain('Apple – 2 pcs ($3.00)');
      expect(text).toContain('DAIRY');
      expect(text).toContain('Milk – 1 L ($2.00)');
      expect(text).toContain('Total Estimated Cost: $5.00');
    });
  });

  describe('render', () => {
    test('renders grouped grocery elements', () => {
      const container = document.createElement('div');
      const items = [
        { category: 'Produce', item: 'Apple', quantity: 2, unit: 'pcs', estimatedCost: 3 },
        { category: 'Dairy', item: 'Milk', quantity: 1, unit: 'L', estimatedCost: 2, isEssential: true }
      ];

      GroceryService.render(container, items);

      // Verify DOM structure
      expect(container.querySelectorAll('.grocery-category-block').length).toBe(2);
      expect(container.textContent).toContain('Produce');
      expect(container.textContent).toContain('Dairy');
      expect(container.textContent).toContain('Apple');
      expect(container.textContent).toContain('Milk');
      expect(container.querySelector('.grocery-essential-badge')).not.toBeNull();
    });
  });
});

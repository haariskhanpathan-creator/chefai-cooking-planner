/**
 * grocery.js
 * ──────────────────────────────────────────────────────────────
 * Grocery list rendering and clipboard export.
 * Uses DocumentFragment for batched, efficient DOM updates.
 * All user-facing text set via textContent (XSS-safe).
 * ──────────────────────────────────────────────────────────────
 */

const GroceryService = (() => {

  // Category display config (icon + order)
  const CATEGORY_CONFIG = {
    'Produce':  { icon: '🥦', order: 1 },
    'Protein':  { icon: '🥩', order: 2 },
    'Dairy':    { icon: '🥛', order: 3 },
    'Grains':   { icon: '🌾', order: 4 },
    'Pantry':   { icon: '🫙', order: 5 },
    'Spices':   { icon: '🌶️', order: 6 },
    'Other':    { icon: '🛒', order: 7 }
  };

  /**
   * Group and sort grocery items by category.
   * @param {Array} items
   * @returns {Map<string, Array>}
   */
  function groupByCategory(items) {
    const map = new Map();
    for (const item of items) {
      const cat = item.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(item);
    }
    // Sort categories by order defined above
    return new Map([...map.entries()].sort(([a], [b]) => {
      const oa = CATEGORY_CONFIG[a]?.order ?? 99;
      const ob = CATEGORY_CONFIG[b]?.order ?? 99;
      return oa - ob;
    }));
  }

  /**
   * Render grocery list into a container element.
   * @param {HTMLElement} container
   * @param {Array} items
   */
  function render(container, items) {
    const frag = document.createDocumentFragment();
    const grouped = groupByCategory(items);

    for (const [category, catItems] of grouped) {
      const config = CATEGORY_CONFIG[category] || { icon: '🛒' };
      const catTotal = catItems.reduce((s, i) => s + (Number(i.estimatedCost) || 0), 0);

      // Category block
      const block = document.createElement('div');
      block.className = 'grocery-category-block';

      // Header
      const header = document.createElement('div');
      header.className = 'grocery-category-header';

      const titleEl = document.createElement('span');
      titleEl.className = 'category-title';
      titleEl.textContent = `${config.icon} ${category}`;

      const totalEl = document.createElement('span');
      totalEl.className = 'category-total';
      totalEl.textContent = `$${catTotal.toFixed(2)}`;

      header.appendChild(titleEl);
      header.appendChild(totalEl);

      // Items list
      const itemsEl = document.createElement('div');
      itemsEl.className = 'grocery-items';

      for (const item of catItems) {
        const row = buildItemRow(item);
        itemsEl.appendChild(row);
      }

      block.appendChild(header);
      block.appendChild(itemsEl);
      frag.appendChild(block);
    }

    container.innerHTML = '';
    container.appendChild(frag);
  }

  /**
   * Build a single grocery item row element.
   * @param {Object} item
   * @returns {HTMLElement}
   */
  function buildItemRow(item) {
    const row = document.createElement('div');
    row.className = 'grocery-item';

    const left = document.createElement('div');
    left.className = 'grocery-item-left';

    // Checkbox (for interactive ticking)
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'grocery-check';
    chk.setAttribute('aria-label', `Mark ${item.item} as purchased`);
    chk.addEventListener('change', () => {
      row.style.opacity = chk.checked ? '0.45' : '1';
      const nameEl = row.querySelector('.grocery-name');
      if (nameEl) nameEl.style.textDecoration = chk.checked ? 'line-through' : 'none';
    });

    const details = document.createElement('div');

    const nameEl = document.createElement('div');
    nameEl.className = 'grocery-name';
    nameEl.textContent = item.item || '';

    const qtyEl = document.createElement('div');
    qtyEl.className = 'grocery-qty';
    qtyEl.textContent = [item.quantity, item.unit].filter(Boolean).join(' ');

    details.appendChild(nameEl);
    details.appendChild(qtyEl);
    left.appendChild(chk);
    left.appendChild(details);

    const right = document.createElement('div');
    right.style.cssText = 'display:flex;gap:8px;align-items:center;';

    if (item.isEssential) {
      const badge = document.createElement('span');
      badge.className = 'grocery-essential-badge';
      badge.textContent = 'Key';
      right.appendChild(badge);
    }

    const cost = document.createElement('span');
    cost.className = 'grocery-cost';
    cost.textContent = item.estimatedCost != null ? `$${Number(item.estimatedCost).toFixed(2)}` : '—';

    right.appendChild(cost);
    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  /**
   * Generate plain text version of grocery list for clipboard.
   * @param {Array} items
   * @param {string} planTitle
   * @returns {string}
   */
  function toPlainText(items, planTitle) {
    const lines = [`🛒 Grocery List – ${planTitle}`, '─'.repeat(40)];
    const grouped = groupByCategory(items);

    for (const [cat, catItems] of grouped) {
      lines.push('', `📦 ${cat.toUpperCase()}`);
      for (const item of catItems) {
        const qty  = [item.quantity, item.unit].filter(Boolean).join(' ');
        const cost = item.estimatedCost != null ? ` ($${Number(item.estimatedCost).toFixed(2)})` : '';
        lines.push(`  • ${item.item} – ${qty}${cost}`);
      }
    }

    const total = items.reduce((s, i) => s + (Number(i.estimatedCost) || 0), 0);
    lines.push('', `─`.repeat(40), `Total Estimated Cost: $${total.toFixed(2)}`);
    return lines.join('\n');
  }

  /**
   * Copy grocery list to clipboard.
   * @param {Array} items
   * @param {string} planTitle
   * @param {HTMLElement} button – trigger button for feedback
   */
  async function copyToClipboard(items, planTitle, button) {
    const text = toPlainText(items, planTitle);
    try {
      await navigator.clipboard.writeText(text);
      const original = button.textContent;
      button.textContent = '✅ Copied!';
      button.disabled = true;
      setTimeout(() => {
        button.textContent = original;
        button.disabled = false;
      }, 2000);
    } catch {
      // Fallback for browsers without clipboard API
      alert('Copy not supported. Here is your list:\n\n' + text);
    }
  }

  return { render, toPlainText, copyToClipboard };
})();

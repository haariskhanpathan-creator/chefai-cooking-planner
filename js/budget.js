/**
 * budget.js
 * ──────────────────────────────────────────────────────────────
 * Budget feasibility logic module.
 * All calculations are pure functions – no side effects.
 * Results are cached per data hash for efficiency.
 * ──────────────────────────────────────────────────────────────
 */

const BudgetService = (() => {

  // Simple cache keyed by JSON hash
  let _cache = {};

  /**
   * Determine colour-coded feasibility status.
   * Rules:
   *   green  – cost ≤ 90% of budget  (comfortably within)
   *   yellow – cost 90%–110% of budget (borderline)
   *   red    – cost > 110% of budget  (over budget)
   *
   * @param {number} estimatedCost
   * @param {number} userBudget
   * @returns {'green'|'yellow'|'red'}
   */
  function getFeasibility(estimatedCost, userBudget) {
    if (!userBudget || userBudget <= 0) return 'yellow';
    const ratio = estimatedCost / userBudget;
    if (ratio <= 0.90) return 'green';
    if (ratio <= 1.10) return 'yellow';
    return 'red';
  }

  /**
   * Compute totals from a grocery list array.
   * @param {Array} groceryList
   * @returns {{ total: number, byCategory: Object }}
   */
  function computeGroceryTotals(groceryList) {
    const cacheKey = JSON.stringify(groceryList);
    if (_cache[cacheKey]) return _cache[cacheKey];

    const byCategory = {};
    let total = 0;

    for (const item of groceryList) {
      const cost = Number(item.estimatedCost) || 0;
      total += cost;
      const cat = item.category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + cost;
    }

    const result = {
      total: +total.toFixed(2),
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, +v.toFixed(2)])
      )
    };

    _cache[cacheKey] = result;
    return result;
  }

  /**
   * Build a formatted budget summary object for rendering.
   * @param {Object} budgetAnalysis – from AI plan
   * @param {number} userBudget     – user's entered budget
   * @returns {Object}
   */
  function buildSummary(budgetAnalysis, userBudget) {
    const cost       = Number(budgetAnalysis.totalEstimatedCost) || 0;
    const perPerson  = Number(budgetAnalysis.costPerPerson)      || 0;
    const feasibility = getFeasibility(cost, userBudget);
    const saved      = +(userBudget - cost).toFixed(2);
    const barPct     = Math.min(100, Math.round((cost / userBudget) * 100));

    const feasibilityLabels = {
      green:  { label: '✅ Within Budget',   css: 'feasibility-green' },
      yellow: { label: '⚠️ Near Budget',     css: 'feasibility-yellow' },
      red:    { label: '🔴 Over Budget',      css: 'feasibility-red' }
    };
    const barCss = { green: 'fill-green', yellow: 'fill-yellow', red: 'fill-red' };

    return {
      cost, perPerson, userBudget, saved, barPct, feasibility,
      label:     feasibilityLabels[feasibility].label,
      badgeCss:  feasibilityLabels[feasibility].css,
      barFillCss: barCss[feasibility],
      breakdown: budgetAnalysis.breakdown  || {},
      savingTips: budgetAnalysis.savingTips || [],
      status:    budgetAnalysis.budgetStatus || (cost <= userBudget ? 'within' : 'over')
    };
  }

  /** Clear cache (call when new plan data arrives) */
  function clearCache() { _cache = {}; }

  return { getFeasibility, computeGroceryTotals, buildSummary, clearCache };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BudgetService;
}

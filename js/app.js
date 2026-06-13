/**
 * app.js
 * ──────────────────────────────────────────────────────────────
 * ChefAI – Main application controller
 *
 * Responsibilities:
 *   • Screen navigation & accessibility focus management
 *   • Form validation with user-visible error messages
 *   • Orchestrates AIService, BudgetService, GroceryService
 *   • Renders all result tabs using safe DOM APIs
 *   • Manages API key in sessionStorage only
 *   • Code Assessment modal with keyboard trap
 *
 * Security: No innerHTML used with any user-supplied data.
 * All dynamic content inserted via textContent or createElement.
 * ──────────────────────────────────────────────────────────────
 */

(function ChefAIApp() {
  'use strict';

  /* ── STATE ─────────────────────────────────────────────── */
  const state = {
    isDemo: false,
    planData: null,
    userBudget: 0,
    currentTab: 'meals',
    lastFocusBefore: null   // for modal focus restoration
  };

  /* ── DOM REFERENCES ────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  const screens = {
    welcome:  $('screen-welcome'),
    form:     $('screen-form'),
    loading:  $('screen-loading'),
    results:  $('screen-results')
  };

  const els = {
    // Welcome
    inputApiKey:    $('input-api-key'),
    btnToggleKey:   $('btn-toggle-key'),
    btnStart:       $('btn-start'),
    btnDemo:        $('btn-demo'),
    // Form
    mealForm:       $('meal-form'),
    inputBudget:    $('input-budget'),
    inputPeople:    $('input-people'),
    inputCuisine:   $('input-cuisine'),
    inputAllergies: $('input-allergies'),
    inputIngredients:$('input-ingredients'),
    btnGenerate:    $('btn-generate'),
    btnBackForm:    $('btn-back-form'),
    modeIndicator:  $('mode-indicator'),
    // Loading
    loadingStatus:  $('loading-status'),
    lstep1: $('lstep-1'), lstep2: $('lstep-2'),
    lstep3: $('lstep-3'), lstep4: $('lstep-4'),
    // Results
    btnBackResults: $('btn-back-results'),
    btnPrint:       $('btn-print'),
    planSummaryBar: $('plan-summary-bar'),
    // Containers
    mealsContainer:         $('meals-container'),
    groceryContainer:       $('grocery-container'),
    budgetContainer:        $('budget-container'),
    substitutionsContainer: $('substitutions-container'),
    tipsContainer:          $('tips-container'),
    btnCopyGrocery:         $('btn-copy-grocery'),
    // Assessment modal
    btnAssessment:        $('btn-assessment'),
    modalAssessment:      $('modal-assessment'),
    btnCloseAssessment:   $('btn-close-assessment'),
  };

  /* ── SCREEN MANAGEMENT ─────────────────────────────────── */
  function showScreen(name) {
    Object.values(screens).forEach(s => {
      s.hidden = true;
      s.classList.remove('screen-active');
    });
    screens[name].hidden = false;
    screens[name].classList.add('screen-active');

    // Move focus to first heading or main in new screen for accessibility
    const heading = screens[name].querySelector('h1, h2, [id="main-content"]');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }

  /* ── API KEY MANAGEMENT (sessionStorage only) ──────────── */
  function saveApiKey(key) {
    try { sessionStorage.setItem('chef_ai_key', key); } catch { /* storage blocked */ }
  }
  function loadApiKey() {
    try { return sessionStorage.getItem('chef_ai_key') || ''; } catch { return ''; }
  }
  function clearApiKey() {
    try { sessionStorage.removeItem('chef_ai_key'); } catch { /* ok */ }
  }

  /* ── FORM VALIDATION ───────────────────────────────────── */
  function validateForm() {
    let valid = true;

    // Budget
    const budget = parseFloat(els.inputBudget.value);
    const budgetErr = $('budget-error');
    if (!budget || budget < 1 || budget > 9999) {
      budgetErr.hidden = false;
      els.inputBudget.setAttribute('aria-invalid', 'true');
      valid = false;
    } else {
      budgetErr.hidden = true;
      els.inputBudget.removeAttribute('aria-invalid');
    }

    // People
    const people = parseInt(els.inputPeople.value, 10);
    const peopleErr = $('people-error');
    if (!people || people < 1 || people > 20) {
      peopleErr.hidden = false;
      els.inputPeople.setAttribute('aria-invalid', 'true');
      valid = false;
    } else {
      peopleErr.hidden = true;
      els.inputPeople.removeAttribute('aria-invalid');
    }

    return valid;
  }

  /* ── COLLECT FORM PREFERENCES ──────────────────────────── */
  function collectPrefs() {
    const dietary = [...document.querySelectorAll('input[name="dietary"]:checked')]
      .map(c => c.value);
    const dayTypeEl = document.querySelector('input[name="day-type"]:checked');
    const dayType   = dayTypeEl ? dayTypeEl.value : 'normal';

    return {
      budget:      parseFloat(els.inputBudget.value),
      people:      parseInt(els.inputPeople.value, 10),
      dayType,
      dietary,
      cuisine:     els.inputCuisine.value,
      allergies:   els.inputAllergies.value.trim().slice(0, 200), // sanitised / length-capped
      ingredients: els.inputIngredients.value.trim().slice(0, 500)
    };
  }

  /* ── LOADING ANIMATION ─────────────────────────────────── */
  let loadingTimer = null;
  function startLoadingAnimation() {
    const steps = [els.lstep1, els.lstep2, els.lstep3, els.lstep4];
    const messages = [
      'Selecting the best recipes…',
      'Building your grocery list…',
      'Analysing budget feasibility…',
      'Finding smart substitutions…'
    ];
    steps.forEach(s => { s.classList.remove('active', 'done'); });
    steps[0].classList.add('active');
    els.loadingStatus.textContent = messages[0];
    let i = 0;

    loadingTimer = setInterval(() => {
      if (i < steps.length - 1) {
        steps[i].classList.remove('active');
        steps[i].classList.add('done');
        i++;
        steps[i].classList.add('active');
        els.loadingStatus.textContent = messages[i];
      }
    }, 800);
  }

  function stopLoadingAnimation() {
    if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
  }

  /* ── ERROR STATE ───────────────────────────────────────── */
  function showError(message) {
    stopLoadingAnimation();
    showScreen('form');
    // Show error message in form – create accessible alert if none exists
    let errBanner = $('global-error-banner');
    if (!errBanner) {
      errBanner = document.createElement('div');
      errBanner.id = 'global-error-banner';
      errBanner.setAttribute('role', 'alert');
      errBanner.style.cssText =
        'background:rgba(255,92,106,0.12);border:1px solid rgba(255,92,106,0.4);' +
        'border-radius:12px;padding:14px 18px;margin-bottom:20px;color:#ff5c6a;' +
        'font-weight:600;font-size:0.88rem;';
      const formMain = document.querySelector('.form-main');
      if (formMain) formMain.insertBefore(errBanner, formMain.firstChild);
    }
    errBanner.hidden = false;
    errBanner.textContent = `⚠️ ${message}`;
    errBanner.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideErrorBanner() {
    const el = $('global-error-banner');
    if (el) el.hidden = true;
  }

  /* ── PLAN GENERATION FLOW ──────────────────────────────── */
  async function generatePlan(isDemo) {
    if (!validateForm()) return;
    hideErrorBanner();

    const prefs    = collectPrefs();
    const apiKey   = isDemo ? null : loadApiKey();
    state.isDemo   = isDemo || !apiKey;
    state.userBudget = prefs.budget;

    showScreen('loading');
    startLoadingAnimation();
    BudgetService.clearCache();

    try {
      const data = await AIService.generatePlan(prefs, apiKey);
      stopLoadingAnimation();
      state.planData = data;
      renderResults(data, prefs);
      showScreen('results');
    } catch (err) {
      // Security: do not expose raw error to console in prod; show sanitised msg
      showError(err.message || 'Something went wrong. Please try again.');
    }
  }

  /* ══════════════════════════════════════════════════════════
     RENDERING FUNCTIONS
     All use textContent / createElement – zero innerHTML with
     user/AI data to prevent XSS.
  ══════════════════════════════════════════════════════════ */

  /* ── Summary Bar ────────────────────────────────────────── */
  function renderSummaryBar(data, prefs) {
    const bar = els.planSummaryBar;
    bar.innerHTML = ''; // safe – no user data here

    const chips = [
      { label: `👥 ${prefs.people} ${prefs.people === 1 ? 'person' : 'people'}` },
      { label: `💰 $${prefs.budget} budget` },
      { label: `⏰ ${capitalize(prefs.dayType)} day` },
      { label: state.isDemo ? '🎭 Demo Mode' : '✨ AI Generated' }
    ];
    if (prefs.cuisine && prefs.cuisine !== 'any') chips.push({ label: `🌍 ${capitalize(prefs.cuisine)}` });
    if (prefs.dietary.length) chips.push({ label: `🥦 ${prefs.dietary.join(', ')}` });

    const frag = document.createDocumentFragment();
    chips.forEach(chip => {
      const el = document.createElement('span');
      el.className = 'summary-chip';
      el.textContent = chip.label;
      frag.appendChild(el);
    });
    bar.appendChild(frag);
  }

  /* ── Meals Tab ──────────────────────────────────────────── */
  function renderMeals(meals) {
    const container = els.mealsContainer;
    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    const order = ['breakfast', 'lunch', 'dinner'];
    const badgeClass = { breakfast: 'badge-breakfast', lunch: 'badge-lunch', dinner: 'badge-dinner' };

    for (const mealType of order) {
      const meal = meals[mealType];
      if (!meal) continue;
      frag.appendChild(buildMealCard(mealType, meal, badgeClass[mealType]));
    }
    container.appendChild(frag);
  }

  function buildMealCard(mealType, meal, badgeCls) {
    const card = document.createElement('article');
    card.className = 'meal-card';
    card.setAttribute('aria-label', `${capitalize(mealType)}: ${meal.name}`);

    // Header
    const header = document.createElement('div');
    header.className = 'meal-header';

    const meta = document.createElement('div');
    meta.className = 'meal-meta';

    const emoji = document.createElement('div');
    emoji.className = 'meal-emoji';
    emoji.textContent = meal.emoji || '🍽️';
    emoji.setAttribute('aria-hidden', 'true');

    const name = document.createElement('h2');
    name.className = 'meal-name';
    name.textContent = meal.name || '';

    const desc = document.createElement('p');
    desc.className = 'meal-desc';
    desc.textContent = meal.description || '';

    meta.append(emoji, name, desc);

    const badge = document.createElement('span');
    badge.className = `meal-type-badge ${badgeCls}`;
    badge.textContent = capitalize(mealType);

    header.append(meta, badge);

    // Stats bar
    const stats = document.createElement('div');
    stats.className = 'meal-stats';
    const statItems = [
      { label: 'Prep', value: meal.prepTime || '—' },
      { label: 'Cook', value: meal.cookTime  || '—' },
      { label: 'Calories', value: meal.calories ? `${meal.calories} kcal` : '—' },
      { label: 'Servings', value: meal.servings || '—' },
      { label: 'Difficulty', value: meal.difficulty || '—' }
    ];
    statItems.forEach(({ label, value }) => {
      const si = document.createElement('div');
      si.className = 'stat-item';
      const sl = document.createElement('span');
      sl.className = 'stat-label';
      sl.textContent = label;
      const sv = document.createElement('span');
      sv.className = 'stat-value';
      sv.textContent = value;
      si.append(sl, sv);
      stats.appendChild(si);
    });

    // Body: collapsibles
    const body = document.createElement('div');
    body.className = 'meal-body';

    // Ingredients
    if (meal.ingredients?.length) {
      body.appendChild(buildCollapsible(
        `🥕 Ingredients (${meal.ingredients.length})`,
        buildIngredientsList(meal.ingredients),
        `${mealType}-ing`
      ));
    }

    // Steps
    if (meal.steps?.length) {
      body.appendChild(buildCollapsible(
        `👨‍🍳 How to Cook`,
        buildStepsList(meal.steps),
        `${mealType}-steps`
      ));
    }

    // Nutrition
    if (meal.nutritionHighlights?.length) {
      const tagWrap = document.createElement('div');
      tagWrap.className = 'nutrition-tags';
      meal.nutritionHighlights.forEach(h => {
        const tag = document.createElement('span');
        tag.className = 'nutrition-tag';
        tag.textContent = h;
        tagWrap.appendChild(tag);
      });
      body.appendChild(buildCollapsible('💪 Nutrition Highlights', tagWrap, `${mealType}-nutr`));
    }

    card.append(header, stats, body);
    return card;
  }

  function buildCollapsible(triggerText, contentEl, id) {
    const wrap = document.createElement('div');
    wrap.className = 'collapsible';

    const trigger = document.createElement('button');
    trigger.className = 'collapsible-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `colbody-${id}`);
    trigger.textContent = triggerText;

    const caret = document.createElement('span');
    caret.className = 'caret';
    caret.textContent = '▼';
    caret.setAttribute('aria-hidden', 'true');
    trigger.appendChild(caret);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'collapsible-body';
    bodyEl.id = `colbody-${id}`;
    bodyEl.hidden = true;
    bodyEl.appendChild(contentEl);

    trigger.addEventListener('click', () => {
      const isOpen = bodyEl.hidden === false;
      bodyEl.hidden = isOpen;
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });

    // Keyboard: Space / Enter to toggle
    trigger.addEventListener('keydown', e => {
      if (e.key === ' ') { e.preventDefault(); trigger.click(); }
    });

    wrap.append(trigger, bodyEl);
    return wrap;
  }

  function buildIngredientsList(ingredients) {
    const ul = document.createElement('ul');
    ul.className = 'ingredient-list';
    for (const ing of ingredients) {
      const li = document.createElement('li');
      li.className = 'ingredient-item';
      const qty = document.createElement('span');
      qty.className = 'ingredient-qty';
      qty.textContent = [ing.quantity, ing.unit].filter(Boolean).join(' ');
      const nm = document.createElement('span');
      nm.textContent = ing.name || '';
      li.append(qty, nm);
      ul.appendChild(li);
    }
    return ul;
  }

  function buildStepsList(steps) {
    const ol = document.createElement('ol');
    ol.className = 'steps-list';
    steps.forEach(step => {
      const li = document.createElement('li');
      li.className = 'step-item';
      li.textContent = step;
      ol.appendChild(li);
    });
    return ol;
  }

  /* ── Budget Tab ─────────────────────────────────────────── */
  function renderBudget(budgetAnalysis, userBudget) {
    const container = els.budgetContainer;
    container.innerHTML = '';

    const summary = BudgetService.buildSummary(budgetAnalysis, userBudget);
    const frag    = document.createDocumentFragment();

    // Hero card
    const hero = document.createElement('div');
    hero.className = 'budget-hero-card';

    const feasBadge = document.createElement('div');
    feasBadge.className = `budget-feasibility-badge ${summary.badgeCss}`;
    feasBadge.textContent = summary.label;

    const nums = document.createElement('div');
    nums.className = 'budget-numbers';

    const numDefs = [
      { label: 'Your Budget',   value: `$${summary.userBudget.toFixed(2)}`, cls: '' },
      { label: 'Estimated Cost', value: `$${summary.cost.toFixed(2)}`,      cls: summary.feasibility === 'red' ? 'over' : 'within' },
      { label: 'Per Person',    value: `$${summary.perPerson.toFixed(2)}`, cls: '' },
      { label: summary.saved >= 0 ? 'Savings' : 'Overage',
        value: `$${Math.abs(summary.saved).toFixed(2)}`,
        cls: summary.saved >= 0 ? 'within' : 'over' }
    ];
    numDefs.forEach(({ label, value, cls }) => {
      const wrap = document.createElement('div');
      wrap.className = 'budget-num';
      const lbl = document.createElement('div');
      lbl.className = 'budget-num-label';
      lbl.textContent = label;
      const val = document.createElement('div');
      val.className = `budget-num-value ${cls}`;
      val.textContent = value;
      wrap.append(lbl, val);
      nums.appendChild(wrap);
    });

    // Progress bar
    const barWrap = document.createElement('div');
    barWrap.className = 'budget-bar-wrap';
    barWrap.setAttribute('role', 'progressbar');
    barWrap.setAttribute('aria-valuenow', summary.barPct);
    barWrap.setAttribute('aria-valuemin', '0');
    barWrap.setAttribute('aria-valuemax', '100');
    barWrap.setAttribute('aria-label', `Budget used: ${summary.barPct}%`);

    const track = document.createElement('div');
    track.className = 'budget-bar-track';
    const fill = document.createElement('div');
    fill.className = `budget-bar-fill ${summary.barFillCss}`;
    fill.style.width = '0%';
    track.appendChild(fill);

    const barLabels = document.createElement('div');
    barLabels.className = 'budget-bar-labels';
    const l0 = document.createElement('span'); l0.textContent = '$0';
    const lMid = document.createElement('span'); lMid.textContent = `$${(userBudget/2).toFixed(0)}`;
    const lMax = document.createElement('span'); lMax.textContent = `$${userBudget}`;
    barLabels.append(l0, lMid, lMax);

    barWrap.append(track, barLabels);
    hero.append(feasBadge, nums, barWrap);
    frag.appendChild(hero);

    // Animate bar after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { fill.style.width = `${summary.barPct}%`; });
    });

    // Breakdown table
    if (summary.breakdown && Object.keys(summary.breakdown).length) {
      const breakCard = document.createElement('div');
      breakCard.className = 'breakdown-card';
      const table = document.createElement('table');
      table.setAttribute('aria-label', 'Cost breakdown by meal');
      const thead = document.createElement('thead');
      const hrow = document.createElement('tr');
      ['Meal', 'Estimated Cost', '% of Total'].forEach(h => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = h;
        hrow.appendChild(th);
      });
      thead.appendChild(hrow);
      const tbody = document.createElement('tbody');

      const mealIcons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };
      let runTotal = 0;
      for (const [meal, cost] of Object.entries(summary.breakdown)) {
        runTotal += Number(cost) || 0;
        const tr = document.createElement('tr');
        const tdMeal = document.createElement('td');
        tdMeal.textContent = `${mealIcons[meal] || '🍽️'} ${capitalize(meal)}`;
        const tdCost = document.createElement('td');
        tdCost.textContent = `$${Number(cost).toFixed(2)}`;
        const tdPct = document.createElement('td');
        const pct = summary.cost > 0 ? Math.round((Number(cost) / summary.cost) * 100) : 0;
        tdPct.textContent = `${pct}%`;
        tr.append(tdMeal, tdCost, tdPct);
        tbody.appendChild(tr);
      }

      // Total row
      const totalRow = document.createElement('tr');
      const tdTotLabel = document.createElement('td');
      tdTotLabel.textContent = '📊 Total';
      const tdTotCost = document.createElement('td');
      tdTotCost.textContent = `$${runTotal.toFixed(2)}`;
      const tdTotPct = document.createElement('td');
      tdTotPct.textContent = '100%';
      totalRow.append(tdTotLabel, tdTotCost, tdTotPct);
      tbody.appendChild(totalRow);

      table.append(thead, tbody);
      breakCard.appendChild(table);
      frag.appendChild(breakCard);
    }

    // Saving tips
    if (summary.savingTips?.length) {
      const tipsCard = document.createElement('div');
      tipsCard.className = 'saving-tips-card';
      const th = document.createElement('h3');
      th.textContent = '💡 Money-Saving Tips';
      tipsCard.appendChild(th);
      summary.savingTips.forEach(tip => {
        const div = document.createElement('div');
        div.className = 'saving-tip';
        div.textContent = tip;
        tipsCard.appendChild(div);
      });
      frag.appendChild(tipsCard);
    }

    container.appendChild(frag);
  }

  /* ── Substitutions Tab ──────────────────────────────────── */
  function renderSubstitutions(subs) {
    const container = els.substitutionsContainer;
    container.innerHTML = '';

    if (!subs?.length) {
      const p = document.createElement('p');
      p.style.color = 'var(--clr-text-muted)';
      p.textContent = 'No substitutions generated for this plan.';
      container.appendChild(p);
      return;
    }

    const frag = document.createDocumentFragment();
    subs.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'sub-card';

      const origWrap = document.createElement('div');
      origWrap.className = 'sub-original';
      const origTag = document.createElement('span');
      origTag.className = 'sub-tag';
      origTag.textContent = 'Replace';
      const origName = document.createElement('span');
      origName.className = 'sub-name';
      origName.textContent = sub.original || '';
      origWrap.append(origTag, origName);

      const arrow = document.createElement('div');
      arrow.className = 'sub-arrow';
      arrow.textContent = '→';
      arrow.setAttribute('aria-hidden', 'true');

      const subWrap = document.createElement('div');
      subWrap.className = 'sub-substitute';
      const subTag = document.createElement('span');
      subTag.className = 'sub-tag';
      subTag.textContent = 'With';
      const subName = document.createElement('span');
      subName.className = 'sub-name';
      subName.textContent = sub.substitute || '';
      subWrap.append(subTag, subName);

      const benefit = document.createElement('span');
      benefit.className = 'sub-benefit';
      benefit.textContent = sub.dietaryBenefit || '';

      const reason = document.createElement('p');
      reason.className = 'sub-reason';
      reason.textContent = sub.reason || '';

      card.append(origWrap, arrow, subWrap, benefit, reason);
      frag.appendChild(card);
    });
    container.appendChild(frag);
  }

  /* ── Tips Tab ───────────────────────────────────────────── */
  function renderTips(tips) {
    const container = els.tipsContainer;
    container.innerHTML = '';

    if (!tips?.length) {
      const p = document.createElement('p');
      p.style.color = 'var(--clr-text-muted)';
      p.textContent = 'No cooking tips available for this plan.';
      container.appendChild(p);
      return;
    }

    const frag = document.createDocumentFragment();
    tips.forEach((tip, i) => {
      const card = document.createElement('div');
      card.className = 'tip-card';
      const num = document.createElement('div');
      num.className = 'tip-num';
      num.textContent = i + 1;
      num.setAttribute('aria-hidden', 'true');
      const text = document.createElement('p');
      text.className = 'tip-text';
      text.textContent = tip;
      card.append(num, text);
      frag.appendChild(card);
    });
    container.appendChild(frag);
  }

  /* ── Master render ──────────────────────────────────────── */
  function renderResults(data, prefs) {
    renderSummaryBar(data, prefs);
    renderMeals(data.meals || {});
    GroceryService.render(els.groceryContainer, data.groceryList || []);
    renderBudget(data.budgetAnalysis || {}, prefs.budget);
    renderSubstitutions(data.substitutions || []);
    renderTips(data.cookingTips || []);

    // Mode indicator badge
    els.modeIndicator.className = `mode-indicator ${state.isDemo ? 'mode-demo' : 'mode-ai'}`;
    els.modeIndicator.textContent = state.isDemo ? '🎭 Demo Mode' : '✨ AI Mode';
  }

  /* ── TAB MANAGEMENT ────────────────────────────────────── */
  function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => {
          t.classList.remove('tab-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('tab-active');
        tab.setAttribute('aria-selected', 'true');

        document.querySelectorAll('.tab-panel').forEach(panel => {
          panel.hidden = (panel.id !== `tab-panel-${target}`);
        });
        state.currentTab = target;
      });
    });
  }

  /* ── ASSESSMENT MODAL ──────────────────────────────────── */
  function openAssessment() {
    state.lastFocusBefore = document.activeElement;
    els.modalAssessment.hidden = false;
    // Trap focus
    els.modalAssessment.querySelector('.modal-box').focus();
  }

  function closeAssessment() {
    els.modalAssessment.hidden = true;
    if (state.lastFocusBefore) state.lastFocusBefore.focus();
  }

  function trapFocus(e, container) {
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  /* ── DAY TYPE CARD SELECTION ────────────────────────────── */
  function initDayTypeCards() {
    const cards = document.querySelectorAll('.day-type-card');
    cards.forEach(card => {
      const input = card.querySelector('input[type="radio"]');
      const inner = card.querySelector('.day-card-inner');

      input.addEventListener('change', () => {
        document.querySelectorAll('.day-card-inner').forEach(i => i.classList.remove('selected'));
        if (input.checked) inner.classList.add('selected');
      });

      // Allow keyboard selection on the span
      inner.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
      });
    });
  }

  /* ── EVENT BINDINGS ────────────────────────────────────── */
  function bindEvents() {

    // Toggle API key visibility
    els.btnToggleKey.addEventListener('click', () => {
      const isPass = els.inputApiKey.type === 'password';
      els.inputApiKey.type = isPass ? 'text' : 'password';
      els.btnToggleKey.textContent = isPass ? '🙈' : '👁';
      els.btnToggleKey.setAttribute('aria-label', isPass ? 'Hide API key' : 'Show API key');
    });

    // Welcome → Form
    els.btnStart.addEventListener('click', () => {
      const key = els.inputApiKey.value.trim();
      if (key) saveApiKey(key);
      else clearApiKey();
      showScreen('form');
      updateModeIndicator();
    });

    // Demo mode
    els.btnDemo.addEventListener('click', () => {
      clearApiKey();
      state.isDemo = true;
      showScreen('form');
      updateModeIndicator();
    });

    // Back from form → welcome
    els.btnBackForm.addEventListener('click', () => showScreen('welcome'));

    // Form submit
    els.mealForm.addEventListener('submit', async e => {
      e.preventDefault();
      await generatePlan(state.isDemo);
    });

    // Back from results → form
    els.btnBackResults.addEventListener('click', () => {
      // Reset tabs
      document.querySelectorAll('.tab-btn').forEach((t, i) => {
        t.classList.toggle('tab-active', i === 0);
        t.setAttribute('aria-selected', String(i === 0));
      });
      document.querySelectorAll('.tab-panel').forEach((p, i) => { p.hidden = i !== 0; });
      showScreen('form');
    });

    // Print
    els.btnPrint.addEventListener('click', () => window.print());

    // Copy grocery
    els.btnCopyGrocery?.addEventListener('click', () => {
      if (!state.planData?.groceryList) return;
      GroceryService.copyToClipboard(
        state.planData.groceryList,
        state.planData.planTitle || 'ChefAI Plan',
        els.btnCopyGrocery
      );
    });

    // Assessment modal open
    els.btnAssessment.addEventListener('click', openAssessment);
    els.btnCloseAssessment.addEventListener('click', closeAssessment);

    // Close on overlay click
    els.modalAssessment.addEventListener('click', e => {
      if (e.target === els.modalAssessment) closeAssessment();
    });

    // Keyboard handling for modal
    els.modalAssessment.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeAssessment(); return; }
      trapFocus(e, els.modalAssessment);
    });
  }

  function updateModeIndicator() {
    const hasKey = !!loadApiKey();
    els.modeIndicator.className = `mode-indicator ${state.isDemo || !hasKey ? 'mode-demo' : 'mode-ai'}`;
    els.modeIndicator.textContent = state.isDemo || !hasKey ? '🎭 Demo Mode' : '✨ AI Mode';
  }

  /* ── UTILITY ───────────────────────────────────────────── */
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* ── INIT ──────────────────────────────────────────────── */
  function init() {
    // Restore saved API key (sessionStorage survives page refresh within session)
    const savedKey = loadApiKey();
    if (savedKey) els.inputApiKey.value = savedKey;

    initDayTypeCards();
    initTabs();
    bindEvents();

    // Set default selected day type visual
    const defaultDay = document.querySelector('input[name="day-type"]:checked');
    if (defaultDay) {
      defaultDay.closest('.day-type-card').querySelector('.day-card-inner').classList.add('selected');
    }

    console.log('%c🍽️ ChefAI loaded', 'color:#ff7c3a;font-weight:700;font-size:14px;');
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

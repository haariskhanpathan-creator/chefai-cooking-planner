/**
 * ai-service.js
 * ──────────────────────────────────────────────────────────────
 * Handles all communication with Google Gemini API.
 * Security: API key retrieved from sessionStorage at call time.
 * Efficiency: Single batched request returns all plan data.
 * Fallback: Demo mode returns deterministic fixture data.
 * ──────────────────────────────────────────────────────────────
 */

const AIService = (() => {

  const GEMINI_ENDPOINT =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  // ── Build the structured prompt ──────────────────────────────
  function buildPrompt(prefs) {
    const { budget, people, dayType, dietary, cuisine, allergies, ingredients } = prefs;
    const dietaryStr = dietary.length ? dietary.join(', ') : 'none';
    const allergyStr = allergies || 'none';
    const ingStr     = ingredients || 'standard pantry staples';
    const cuisineStr = cuisine === 'any' ? 'any cuisine (surprise the user)' : cuisine;

    return `You are ChefAI, a professional nutritionist and personal chef assistant.
Generate a complete personalised daily meal plan and return ONLY valid JSON – no markdown, no backticks, no explanation.

Use EXACTLY this JSON structure:
{
  "planTitle": "string",
  "meals": {
    "breakfast": {
      "name": "string",
      "emoji": "string (single emoji)",
      "description": "string (1-2 sentences)",
      "prepTime": "string e.g. 10 mins",
      "cookTime": "string e.g. 15 mins",
      "calories": number,
      "servings": number,
      "difficulty": "Easy|Medium|Hard",
      "ingredients": [{"name":"string","quantity":"string","unit":"string"}],
      "steps": ["string"],
      "nutritionHighlights": ["string"]
    },
    "lunch":   { /* same as breakfast */ },
    "dinner":  { /* same as breakfast */ }
  },
  "groceryList": [
    {
      "category": "Produce|Dairy|Protein|Grains|Spices|Pantry|Other",
      "item": "string",
      "quantity": "string",
      "unit": "string",
      "estimatedCost": number,
      "isEssential": boolean
    }
  ],
  "substitutions": [
    {
      "original": "string",
      "substitute": "string",
      "reason": "string",
      "dietaryBenefit": "string"
    }
  ],
  "budgetAnalysis": {
    "totalEstimatedCost": number,
    "costPerPerson": number,
    "feasibility": "green|yellow|red",
    "breakdown": {
      "breakfast": number,
      "lunch": number,
      "dinner": number
    },
    "savingTips": ["string"],
    "budgetStatus": "within|over|under"
  },
  "cookingTips": ["string"]
}

User preferences:
- Budget: $${budget} total for ${people} people
- Dietary restrictions: ${dietaryStr}
- Cuisine: ${cuisineStr}
- Day type: ${dayType}
- Allergies (STRICTLY avoid): ${allergyStr}
- Available ingredients: ${ingStr}

Rules:
- Keep total grocery cost near $${budget}; flag red if >110%, yellow if 90-110%, green if ≤90%
- Honour ALL dietary restrictions and allergies
- Busy day: each meal ≤20 mins total; Normal: ≤35 mins; Relaxed: up to 60 mins
- Provide 4-5 substitutions covering cost, dietary or availability swaps
- Provide 5-8 practical cooking tips
- servings must equal ${people}
- All cost numbers are in USD with 2 decimal places`;
  }

  // ── Call Gemini API ──────────────────────────────────────────
  async function callGemini(prompt, apiKey) {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096
      }
    };

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini API error: ${msg}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from AI.');

    // Strip potential markdown fences before parsing
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('AI returned invalid JSON. Please try again.');
    }
    return parsed;
  }

  // ── Demo fixture data ────────────────────────────────────────
  function getDemoData(prefs) {
    const { people, budget } = prefs;
    const bCost = +(budget * 0.25).toFixed(2);
    const lCost = +(budget * 0.30).toFixed(2);
    const dCost = +(budget * 0.35).toFixed(2);
    const total = +(bCost + lCost + dCost).toFixed(2);

    return {
      planTitle: `Demo Meal Plan for ${people} • Budget $${budget}`,
      meals: {
        breakfast: {
          name: 'Avocado Toast with Poached Eggs',
          emoji: '🥑',
          description: 'Creamy avocado on crispy sourdough topped with perfectly poached eggs and a sprinkle of chilli flakes.',
          prepTime: '5 mins', cookTime: '10 mins',
          calories: 420, servings: people, difficulty: 'Easy',
          ingredients: [
            { name: 'Sourdough bread', quantity: `${people * 2}`, unit: 'slices' },
            { name: 'Ripe avocados', quantity: `${people}`, unit: 'whole' },
            { name: 'Eggs', quantity: `${people * 2}`, unit: 'large' },
            { name: 'Lemon', quantity: '1', unit: 'whole' },
            { name: 'Chilli flakes', quantity: '½', unit: 'tsp' },
            { name: 'Salt & pepper', quantity: 'to taste', unit: '' }
          ],
          steps: [
            'Toast sourdough slices until golden.',
            'Halve avocados, remove stone, scoop into bowl. Add lemon juice, salt, mash roughly.',
            'Bring 5cm water to gentle simmer in pan. Crack each egg into a cup, swirl water, slide egg in. Poach 3 mins.',
            'Spread avocado mash on toast, top with poached egg, season and add chilli flakes.'
          ],
          nutritionHighlights: ['High protein', 'Healthy fats', 'High fibre', 'Low sugar']
        },
        lunch: {
          name: 'Chicken & Veggie Stir-fry Bowl',
          emoji: '🥘',
          description: 'Juicy chicken strips tossed with colourful vegetables in a ginger-soy glaze, served over steamed jasmine rice.',
          prepTime: '10 mins', cookTime: '15 mins',
          calories: 560, servings: people, difficulty: 'Easy',
          ingredients: [
            { name: 'Chicken breast', quantity: `${people * 150}`, unit: 'g' },
            { name: 'Jasmine rice', quantity: `${people}`, unit: 'cups' },
            { name: 'Bell peppers', quantity: `${people}`, unit: 'whole' },
            { name: 'Broccoli florets', quantity: '2', unit: 'cups' },
            { name: 'Soy sauce', quantity: '3', unit: 'tbsp' },
            { name: 'Fresh ginger', quantity: '1', unit: 'inch piece' },
            { name: 'Garlic cloves', quantity: '3', unit: 'cloves' },
            { name: 'Sesame oil', quantity: '1', unit: 'tbsp' }
          ],
          steps: [
            'Cook jasmine rice per package instructions.',
            'Slice chicken into thin strips. Season lightly.',
            'Heat wok over high heat. Stir-fry chicken until cooked through, set aside.',
            'Add vegetables, ginger and garlic. Stir-fry 3-4 mins.',
            'Return chicken. Add soy sauce and sesame oil. Toss to coat.',
            'Serve over rice.'
          ],
          nutritionHighlights: ['High protein', 'Low fat', 'Rich in vitamins', 'Complex carbs']
        },
        dinner: {
          name: 'Garlic Butter Salmon with Roasted Veg',
          emoji: '🐟',
          description: 'Flaky pan-seared salmon fillets with fragrant garlic-herb butter, alongside honey-roasted seasonal vegetables.',
          prepTime: '10 mins', cookTime: '25 mins',
          calories: 680, servings: people, difficulty: 'Medium',
          ingredients: [
            { name: 'Salmon fillets', quantity: `${people}`, unit: '150g pieces' },
            { name: 'Butter', quantity: '3', unit: 'tbsp' },
            { name: 'Garlic cloves', quantity: '4', unit: 'cloves' },
            { name: 'Fresh thyme', quantity: '4', unit: 'sprigs' },
            { name: 'Zucchini', quantity: `${people}`, unit: 'whole' },
            { name: 'Cherry tomatoes', quantity: '1', unit: 'cup' },
            { name: 'Baby potatoes', quantity: '400', unit: 'g' },
            { name: 'Honey', quantity: '1', unit: 'tbsp' },
            { name: 'Olive oil', quantity: '2', unit: 'tbsp' }
          ],
          steps: [
            'Preheat oven to 200°C. Halve potatoes, toss with olive oil, salt. Roast 20 mins.',
            'After 10 mins, add zucchini, tomatoes and honey to tray.',
            'Season salmon fillets. Heat oil in oven-safe pan over high heat.',
            'Sear salmon skin-side down 3 mins, flip.',
            'Add butter, garlic and thyme to pan. Baste salmon with the foaming butter 2 mins.',
            'Plate with roasted vegetables.'
          ],
          nutritionHighlights: ['Omega-3 rich', 'High protein', 'Anti-inflammatory', 'Vitamin D']
        }
      },
      groceryList: [
        { category: 'Produce', item: 'Avocados', quantity: `${people}`, unit: 'whole', estimatedCost: +(people * 1.2).toFixed(2), isEssential: true },
        { category: 'Produce', item: 'Bell peppers', quantity: `${people}`, unit: 'whole', estimatedCost: +(people * 0.8).toFixed(2), isEssential: true },
        { category: 'Produce', item: 'Broccoli', quantity: '1 head', unit: '', estimatedCost: 1.80, isEssential: true },
        { category: 'Produce', item: 'Zucchini', quantity: `${people}`, unit: 'whole', estimatedCost: +(people * 0.6).toFixed(2), isEssential: false },
        { category: 'Produce', item: 'Cherry tomatoes', quantity: '1', unit: 'punnet', estimatedCost: 2.50, isEssential: false },
        { category: 'Produce', item: 'Lemon', quantity: '1', unit: 'whole', estimatedCost: 0.50, isEssential: true },
        { category: 'Protein', item: 'Eggs', quantity: `${people * 2}`, unit: 'large', estimatedCost: +(people * 0.5).toFixed(2), isEssential: true },
        { category: 'Protein', item: 'Chicken breast', quantity: `${people * 150}g`, unit: '', estimatedCost: +(people * 1.8).toFixed(2), isEssential: true },
        { category: 'Protein', item: 'Salmon fillets', quantity: `${people}`, unit: 'fillets', estimatedCost: +(people * 3.5).toFixed(2), isEssential: true },
        { category: 'Dairy', item: 'Butter', quantity: '100g', unit: '', estimatedCost: 1.20, isEssential: true },
        { category: 'Grains', item: 'Sourdough bread', quantity: '1', unit: 'loaf', estimatedCost: 3.00, isEssential: true },
        { category: 'Grains', item: 'Jasmine rice', quantity: '1', unit: 'cup', estimatedCost: 1.20, isEssential: true },
        { category: 'Grains', item: 'Baby potatoes', quantity: '400g', unit: '', estimatedCost: 2.00, isEssential: false },
        { category: 'Pantry', item: 'Soy sauce', quantity: '1', unit: 'bottle', estimatedCost: 2.50, isEssential: false },
        { category: 'Pantry', item: 'Sesame oil', quantity: '1', unit: 'small bottle', estimatedCost: 2.80, isEssential: false },
        { category: 'Spices', item: 'Chilli flakes', quantity: '1', unit: 'jar', estimatedCost: 1.50, isEssential: false },
        { category: 'Spices', item: 'Fresh thyme', quantity: '1', unit: 'pack', estimatedCost: 1.00, isEssential: false }
      ],
      substitutions: [
        { original: 'Salmon', substitute: 'Canned tuna', reason: 'Canned tuna delivers similar omega-3s at a fraction of the price and requires no cooking.', dietaryBenefit: 'budget-friendly' },
        { original: 'Sourdough bread', substitute: 'Whole wheat bread', reason: 'Higher fibre, widely available and significantly cheaper than artisan sourdough.', dietaryBenefit: 'higher fibre' },
        { original: 'Butter', substitute: 'Olive oil', reason: 'Heart-healthier fat with a higher smoke point, great for cooking salmon.', dietaryBenefit: 'dairy-free' },
        { original: 'Chicken breast', substitute: 'Tofu', reason: 'Firm tofu soaks up the ginger-soy glaze beautifully and is vegan-friendly.', dietaryBenefit: 'vegan-friendly' },
        { original: 'Jasmine rice', substitute: 'Cauliflower rice', reason: 'Dramatically reduces carbs while adding vitamins. Ready in 5 minutes.', dietaryBenefit: 'low-carb / keto' }
      ],
      budgetAnalysis: {
        totalEstimatedCost: total,
        costPerPerson: +(total / people).toFixed(2),
        feasibility: total <= budget ? 'green' : total <= budget * 1.1 ? 'yellow' : 'red',
        breakdown: { breakfast: bCost, lunch: lCost, dinner: dCost },
        savingTips: [
          'Buy chicken and salmon in bulk and freeze individual portions.',
          'Purchase seasonal vegetables from local farmers markets.',
          'Use leftover rice from lunch in a fried rice breakfast tomorrow.',
          'Frozen broccoli costs ~40% less and retains the same nutrition.',
          'Make your own soy-ginger sauce from scratch to avoid premium brand costs.'
        ],
        budgetStatus: total <= budget ? 'within' : 'over'
      },
      cookingTips: [
        'Prep all vegetables first thing in the morning so they\'re ready to cook at lunch and dinner.',
        'Keep avocado fresh by storing with the stone in and wrapping tightly in cling film.',
        'For perfect poached eggs, add a splash of white vinegar to the water.',
        'Marinate chicken for even 15 minutes in soy sauce for deeper flavour.',
        'Baste the salmon constantly while pan-frying for a restaurant-quality crust.',
        'Roast potatoes at high heat (200°C+) for a crispy exterior.',
        'Taste and adjust seasoning at every stage of cooking – small adjustments make big differences.'
      ]
    };
  }

  // ── Public interface ─────────────────────────────────────────
  return {
    /**
     * generatePlan
     * @param {Object} prefs – user preferences from the form
     * @param {string|null} apiKey – Gemini API key from sessionStorage
     * @returns {Promise<Object>} – structured plan data
     */
    async generatePlan(prefs, apiKey) {
      if (!apiKey) {
        // Demo mode: simulate network delay for realism
        await new Promise(r => setTimeout(r, 2400));
        return getDemoData(prefs);
      }
      const prompt = buildPrompt(prefs);
      return callGemini(prompt, apiKey);
    }
  };
})();

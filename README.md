# 🍽️ ChefAI – Personal AI Cooking Planner

> A fully accessible, secure, AI-powered daily meal planning micro-app.

---

## 🚀 Quick Start

Open `index.html` in any modern browser. No build step required.

**With AI (Gemini):**
1. Get a free API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Paste it into the API key field on the welcome screen
3. Fill in your preferences and click **Generate My Meal Plan**

**Demo Mode (no API key needed):**
- Click **Try Demo Mode** on the welcome screen
- A full realistic plan is generated instantly from local fixture data

---

## 📁 Project Structure

```
new/
├── index.html          # Semantic HTML structure – 5 screens
├── styles.css          # Full design system (dark theme, glassmorphism)
├── js/
│   ├── app.js          # Main controller – navigation, rendering, events
│   ├── ai-service.js   # Gemini API integration + demo fixture data
│   ├── budget.js       # Pure budget feasibility logic (cached)
│   └── grocery.js      # Grocery grouping, rendering, clipboard export
└── README.md           # This file
```

---

## ✅ Feature Checklist

| Feature | Status |
|---------|--------|
| Meal planning flow (B / L / D) | ✅ |
| AI-generated daily cooking plan | ✅ Gemini 1.5 Flash |
| Grocery list with categories & costs | ✅ |
| Food substitutions with benefit labels | ✅ |
| Budget feasibility logic (green / yellow / red) | ✅ |
| Budget bar with percentage visualisation | ✅ |
| Cost breakdown per meal | ✅ |
| Money-saving tips | ✅ |
| Cooking tips | ✅ |
| Nutrition highlights | ✅ |
| Print / export support | ✅ Print stylesheet |
| Copy grocery list to clipboard | ✅ |
| Interactive grocery check-off | ✅ |
| Collapsible ingredient / steps sections | ✅ |
| Demo mode (no API key) | ✅ |

---

## 🔒 Security

| Measure | Implementation |
|---------|---------------|
| API key storage | `sessionStorage` only – auto-cleared on tab close |
| XSS prevention | All dynamic content via `textContent` / `createElement` |
| Input sanitisation | Length caps + numeric validation before any use |
| No eval | Zero `eval()`, `Function()`, `document.write()` usage |
| HTTPS only | Gemini API endpoint is HTTPS; no mixed content |
| JSON validation | `try/catch` around every `JSON.parse()` call |

---

## ♿ Accessibility (WCAG 2.1 AA)

- Skip-to-content link
- All inputs have associated `<label>` elements
- ARIA roles: `dialog`, `main`, `complementary`, `alert`, `progressbar`
- `aria-live="polite"` on loading & result regions
- Focus trapped in modal; restored to trigger on close
- Color contrast ≥ 4.5:1 throughout
- Full keyboard navigation (Tab, Shift+Tab, Enter, Space, Escape)
- No color-only information (icons + text always paired)
- `@media (prefers-reduced-motion)` respected

---

## ⚡ Efficiency

- Single AI API call returns all data (meals + grocery + budget + substitutions)
- Budget calculations cached by JSON hash (`BudgetService`)
- DOM updates via `DocumentFragment` (single reflow per render)
- CSS animations use `transform` + `opacity` (GPU-composited)
- Budget bar animated via `requestAnimationFrame` (double-RAF pattern)
- Module pattern (IIFE) prevents global namespace pollution
- Demo mode requires zero network calls

---

## 🧪 Testing Scenarios

| Scenario | Expected Behaviour |
|----------|--------------------|
| Budget < $5 | Form accepts, AI generates budget-conscious plan |
| Budget = $9999 | Form accepts, AI generates premium plan |
| Budget = 0 | Validation error: "Please enter a valid budget" |
| People = 0 | Validation error: "Please enter 1–20 people" |
| No API key | Falls through to Demo Mode automatically |
| Invalid API key | Shows "Gemini API error: …" banner, returns to form |
| Allergy = peanuts | AI instructed to strictly avoid peanuts |
| Vegan + dairy | Both restrictions sent in prompt |
| Busy day type | Meals ≤ 20 mins each |
| Relaxed day | Can include elaborate 60-min recipes |
| Network failure | Error caught, user-friendly message displayed |
| JSON parse failure | Caught, user asked to try again |

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Background | `#0d0f14` |
| Surface | `#161921` |
| Primary | `#ff7c3a` (warm orange) |
| Secondary | `#ffb347` |
| Accent | `#ffd580` |
| Success | `#4cdf7a` |
| Warning | `#ffbe45` |
| Danger | `#ff5c6a` |
| Font | Inter + Playfair Display |

---

## 🔗 GitHub

Repository: [https://github.com/haariskhanpathan-creator](https://github.com/haariskhanpathan-creator)

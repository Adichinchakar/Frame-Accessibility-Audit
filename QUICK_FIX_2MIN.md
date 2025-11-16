# ⚡ QUICK FIX - 2 Minutes

## The Problem
White screen = `localStorage` in ui.html (not allowed in Figma)

## The Fix (2 steps)

### Step 1: Fix ui.html
**Open ui.html** → Search for `localStorage` → Delete these 2 lines:
```javascript
const onboardingCompleted = localStorage.getItem('a11y-onboarding-completed');
const isAuthChecked = localStorage.getItem('a11y-auth-checked');
```

Replace the `initializeApp()` function with:
```javascript
function initializeApp() {
  showMainApp();
  updateWCAGDescription();
  console.log('A11y Audit Pro initialized');
}
```

### Step 2: Add to code.ts
**Open CODE_ADDITIONS.ts** → Copy ALL code → Paste at bottom of code.ts

### Step 3: Rebuild
```bash
npm run build
```

### Step 4: Reload plugin in Figma

## Done! ✅

White screen → Working plugin!

---

**Detailed Guide:** See COMPLETE_FIX_GUIDE.md

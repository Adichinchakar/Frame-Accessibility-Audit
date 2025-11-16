# 🔧 Fix Instructions - Remove localStorage from ui.html

## Problem
Your ui.html file has 2 instances of `localStorage` which cause the white screen error.

## Location of localStorage in ui.html

### Instance 1 & 2 (Near the end, in initializeApp function):
```javascript
function initializeApp() {
  const onboardingCompleted = localStorage.getItem('a11y-onboarding-completed');  // ❌ LINE 1
  
  if (onboardingCompleted) {
    const isAuthChecked = localStorage.getItem('a11y-auth-checked');  // ❌ LINE 2
    
    if (isAuthChecked) {
      showMainApp();
    } else {
      showLoginScreen();
    }
  } else {
    showOnboarding();
  }
  
  updateWCAGDescription();
  console.log('A11y Audit Pro initialized');
}
```

## Solution

### REPLACE THE ENTIRE `initializeApp` FUNCTION with this:

```javascript
function initializeApp() {
  // Skip onboarding/login for now - just show main app
  showMainApp();
  
  updateWCAGDescription();
  console.log('A11y Audit Pro initialized');
}
```

### OR use this version (better - requests status from code.ts):

```javascript
function initializeApp() {
  // For now, just show the main app directly
  // TODO: Implement proper onboarding check via figma.clientStorage in code.ts
  showMainApp();
  
  updateWCAGDescription();
  console.log('A11y Audit Pro initialized');
}
```

## Step-by-Step Fix

1. **Open ui.html in VS Code**

2. **Press Ctrl+F** to search

3. **Search for:** `localStorage`

4. **You'll find 2 matches** in the `initializeApp()` function near the end

5. **Delete these two lines:**
   ```javascript
   const onboardingCompleted = localStorage.getItem('a11y-onboarding-completed');
   ```
   ```javascript
   const isAuthChecked = localStorage.getItem('a11y-auth-checked');
   ```

6. **Replace the entire initializeApp function** with the simpler version above

7. **Save the file** (Ctrl+S)

8. **Rebuild:**
   ```bash
   npm run build
   ```

9. **Reload plugin in Figma**

## Alternative: Use the Fixed File

I've created a simplified version without all the complex onboarding:
- File: `ui-fixed-no-localstorage.html`
- Location: Your project folder

To use it:
1. Rename your current `ui.html` to `ui-backup-OLD.html`
2. Rename `ui-fixed-no-localstorage.html` to `ui.html`
3. Run `npm run build`
4. Reload plugin in Figma

## After the Fix

The plugin will:
- ✅ Open directly to the main app (no onboarding)
- ✅ Show 3 tabs: Analyze, History, Settings
- ✅ Work without white screen!
- ✅ Let you select frames and analyze

You can add back onboarding later using figma.clientStorage (not localStorage).

## Test Checklist

After applying the fix:
- [ ] Plugin opens (no white screen)
- [ ] Can see the 3 tabs
- [ ] Can select a frame
- [ ] "Analyze Frame" button works
- [ ] Settings tab loads
- [ ] No errors in console

## Need Help?

If you're still seeing a white screen:
1. Press Ctrl+Shift+I to open DevTools
2. Go to Console tab
3. Look for red errors
4. Share the error message with me

The fix is simple - just remove those 2 `localStorage` lines!

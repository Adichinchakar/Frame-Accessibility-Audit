# 🚀 COMPLETE FIX GUIDE - White Screen Issue

**Problem:** Your plugin shows a white screen because `localStorage` is not available in Figma plugins.

**Solution:** Remove localStorage from ui.html and add message handlers to code.ts

---

## 📋 STEP 1: Fix ui.html (Remove localStorage)

### Option A: Quick Fix (Recommended)

1. Open `ui.html` in VS Code
2. Press **Ctrl+F** to find
3. Search for: `localStorage`
4. You'll find 2 lines near the end in the `initializeApp()` function
5. Replace the ENTIRE `initializeApp` function with this:

```javascript
function initializeApp() {
  // Just show the main app (skip onboarding for now)
  showMainApp();
  updateWCAGDescription();
  console.log('A11y Audit Pro initialized');
}
```

6. Save the file

### Option B: Use the Fixed UI File

1. Find the file: `ui-fixed-no-localstorage.html` in your project folder
2. Backup your current ui.html:
   - Rename `ui.html` to `ui-backup-BROKEN.html`
3. Rename `ui-fixed-no-localstorage.html` to `ui.html`

---

## 📋 STEP 2: Update code.ts (Add Message Handlers)

Your code.ts is missing the message handler. Add this code:

### Where to add in code.ts:

1. **Open code.ts**
2. **Scroll to the bottom** of the file
3. **Before the last line** (usually before any exports), add the code from `CODE_ADDITIONS.ts`

### What to add:

Copy everything from the file `CODE_ADDITIONS.ts` I just created, and paste it at the bottom of your `code.ts` file (before the closing brace if there is one).

The code includes:
- ✅ UserSettings interface
- ✅ loadSettings() and saveSettings() functions
- ✅ figma.ui.onmessage handler
- ✅ figma.on('selectionchange') handler
- ✅ Initial selection state

---

## 📋 STEP 3: Rebuild and Test

1. **Build the plugin:**
   ```bash
   npm run build
   ```

2. **Reload in Figma:**
   - Close the plugin if it's open
   - Re-run from Plugins menu
   - OR press `Ctrl+Alt+P` (Windows) / `Cmd+Opt+P` (Mac)

3. **Test:**
   - [ ] Plugin opens (no white screen!)
   - [ ] Can see 3 tabs: Analyze, History, Settings
   - [ ] Select a frame
   - [ ] "Analyze Frame" button becomes enabled
   - [ ] Click "Analyze Frame" - it works!
   - [ ] Go to Settings tab
   - [ ] Change WCAG version
   - [ ] Click "Save Settings"
   - [ ] Reload plugin - settings persist!

---

## 🎯 What This Fix Does

### Before (Broken):
```
ui.html → localStorage.getItem() → ❌ SecurityError → White Screen
```

### After (Fixed):
```
ui.html → postMessage → code.ts → figma.clientStorage → ✅ Works!
```

---

## 📁 Files Reference

I created these files for you:

1. **FIX_LOCALSTORAGE_NOW.md** - Quick fix instructions for ui.html
2. **CODE_ADDITIONS.ts** - Code to add to code.ts
3. **ui-fixed-no-localstorage.html** - Complete working UI file
4. **THIS FILE** - Complete step-by-step guide

---

## 🐛 Troubleshooting

### Still seeing white screen?

1. **Check Browser Console:**
   - Press `Ctrl+Shift+I` (Windows) or `Cmd+Opt+I` (Mac)
   - Look for red errors
   - If you see "localStorage", you missed a spot

2. **Verify localStorage is gone:**
   ```bash
   # In your project folder, run:
   grep -r "localStorage" ui.html
   ```
   Should return nothing!

3. **Check code.ts has message handler:**
   ```bash
   grep "figma.ui.onmessage" code.ts
   ```
   Should find the handler!

4. **Rebuild properly:**
   ```bash
   # Delete old build
   rm -rf dist/
   
   # Rebuild fresh
   npm run build
   ```

5. **Check dist/ folder:**
   - Make sure `dist/ui.html` exists
   - Make sure `dist/code.js` exists

### "Analyze Frame" button not working?

- Make sure you copied the message handler from CODE_ADDITIONS.ts
- Make sure `analyzeFrame()` function exists in your code.ts
- Check browser console for errors

### Settings not saving?

- Make sure `figma.clientStorage.setAsync` is in your code.ts
- Check that you're using the correct key name: 'user-settings'

---

## ✅ Success Checklist

After completing all steps:

- [ ] No white screen
- [ ] UI loads with 3 tabs
- [ ] Can select frames
- [ ] Analyze button works
- [ ] Results display correctly
- [ ] Settings load and save
- [ ] No red errors in console
- [ ] Plugin works after reload

---

## 🎉 You're Done!

Once all checklist items are ✅, your plugin is fixed!

**Need more help?** Share:
1. Screenshot of the error (if any)
2. First 20 lines of your ui.html
3. Last 50 lines of your code.ts

---

**Quick Command Summary:**
```bash
# 1. Fix ui.html (remove localStorage lines)
# 2. Add code from CODE_ADDITIONS.ts to code.ts
# 3. Rebuild:
npm run build

# 4. Reload plugin in Figma
```

**That's it! Your white screen is history.** 🚀

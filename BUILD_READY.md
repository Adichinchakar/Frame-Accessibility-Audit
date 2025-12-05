# 🚀 A11y Audit Pro - Clean Build Ready

## ✅ What's Been Done

### 1. **code.ts** - Complete clean rewrite
- Beta/Trial system with configurable modes
- All 4 accessibility checks working
- One-click fixes for spacing issues
- Visual overlays on canvas
- License management
- Razorpay payment integration
- History tracking

### 2. **ui.html** - Complete clean UI
- Beta banner (green) when BETA_MODE = true
- Trial banner (orange) with countdown
- Usage bar for free users
- Professional Shadcn-inspired styling
- Focused issue mode with keyboard navigation
- Upgrade modals with Razorpay checkout

### 3. **manifest.json** - Fixed (no more merge conflicts)
- Version 2.1.0
- Razorpay network access enabled

---

## 🎛️ Beta/Trial Configuration

### Current Setting (For Testers):
```typescript
const BETA_MODE = true;  // All users get unlimited access
```

### When Ready to Launch (Per-User 30-Day Trial):
```typescript
const BETA_MODE = false;
const TRIAL_CONFIG = {
  enabled: true,
  durationDays: 30,
  globalTrialEndDate: null  // Each user gets 30 days from first use
};
```

### When Ready to Launch (Fixed End Date):
```typescript
const BETA_MODE = false;
const TRIAL_CONFIG = {
  enabled: true,
  durationDays: 30,
  globalTrialEndDate: '2025-01-31'  // All trials end on this date
};
```

---

## 🧹 Files to Delete (Cleanup)

Run these commands in your project folder:

```bash
# Delete redundant code files
del code-enhanced.ts
del code-fixed.ts

# Delete redundant UI files
del ui-backup-old.html
del ui-complete-new.html
del ui-new.html

# Delete old DeepSeek reference
del Deepseek.txt

# Delete old supabase file from dist
del dist\supabase-client.js
```

Or manually delete these files:
- [ ] `code-enhanced.ts`
- [ ] `code-fixed.ts`
- [ ] `ui-backup-old.html`
- [ ] `ui-complete-new.html`
- [ ] `ui-new.html`
- [ ] `Deepseek.txt`
- [ ] `dist/supabase-client.js`

---

## 🔨 Build Instructions

```bash
cd "C:\Users\Admin\Desktop\Project-Figma-Plugin\Frame-Accessibility-Audit"

# Install dependencies (if needed)
npm install

# Build the plugin
npm run build
```

This will:
1. Compile `code.ts` → `dist/code.js`
2. Copy `ui.html` → `dist/ui.html`

---

## 🧪 Testing in Figma

1. Open Figma Desktop
2. Go to **Menu → Plugins → Development → Import plugin from manifest**
3. Select: `C:\Users\Admin\Desktop\Project-Figma-Plugin\Frame-Accessibility-Audit\manifest.json`
4. The plugin should appear in your plugins menu
5. Select a frame and run the plugin

### What to Test:
- [ ] Plugin opens without errors
- [ ] Beta banner shows (green)
- [ ] Frame selection works
- [ ] Analysis runs and finds issues
- [ ] Visual overlays appear on canvas
- [ ] One-click fixes work
- [ ] "Jump to & Fix" focuses on elements
- [ ] History tab shows past analyses
- [ ] Settings save/load correctly

---

## 📊 License Plans

| Plan | Analyses | History | Price |
|------|----------|---------|-------|
| Beta | Unlimited | 50 | Free (testing) |
| Trial | Unlimited | 50 | Free (30 days) |
| Free | 10/month | 5 | $0 |
| Pro | Unlimited | 50 | $6/month |
| Team | Unlimited | 50 | $22/month (5 seats) |

---

## 🔑 How Beta Mode Works

When `BETA_MODE = true`:
1. All users automatically get `plan: 'beta'`
2. Green banner shows "🎉 Beta Mode Active - Unlimited Access!"
3. No analysis limits
4. No trial countdown
5. Perfect for testing with your testers

When you're ready to launch:
1. Set `BETA_MODE = false`
2. Users will be assigned `plan: 'trial'` on first use
3. Trial countdown shows in orange banner
4. After trial expires, converts to `plan: 'free'`
5. Free users see usage bar and upgrade prompts

---

## 🚨 Troubleshooting

### "Cannot find module" error
```bash
npm install
npm run build
```

### Plugin not loading in Figma
1. Make sure `dist/code.js` exists
2. Make sure `dist/ui.html` exists
3. Re-import the manifest

### Console errors
Press F12 in Figma Desktop to see console logs.

---

## 📁 Final Project Structure

```
Frame-Accessibility-Audit/
├── code.ts              ← Main plugin logic
├── ui.html              ← Plugin UI
├── manifest.json        ← Plugin config
├── package.json         ← Build scripts
├── tsconfig.json        ← TypeScript config
├── dist/
│   ├── code.js         ← Compiled (after build)
│   └── ui.html         ← Copied (after build)
├── docs/               ← Documentation
└── README.md           ← Project readme
```

---

## ✨ Ready to Go!

1. Delete the redundant files listed above
2. Run `npm run build`
3. Test in Figma
4. Share with testers while BETA_MODE = true
5. When ready, set BETA_MODE = false for public launch

**You're all set! 🎉**

# 🧠 Context Reference - Anti-Hallucination Guide

**Purpose:** This document contains all critical facts about the plugin to maintain context in long conversations and prevent AI hallucination.

**Last Updated:** November 26, 2025

---

## 📌 Plugin Core Facts

### Identity
- **Name:** A11y Audit Pro (recommended) or AccessFlow Pro (backup)
- **Full Marketplace Name:** A11y Audit Pro - WCAG 2.2 Accessibility Checker
- **Current Version:** 1.0.0
- **Status:** Pre-marketplace (development) - Core features working
- **Technology:** TypeScript + HTML/CSS/JS (Figma Plugin API)

### Purpose
Comprehensive WCAG 2.0/2.1/2.2 accessibility checker for Figma frames with one-click fixes and visual overlays

---

## 🏗️ Technical Architecture (Simplified)

### File Structure
```
Frame-Accessibility-Audit/
├── code.ts              # Main plugin logic (sandbox) - ~800 lines
├── ui.html              # Plugin UI (iframe) - ~900 lines
├── manifest.json        # Figma plugin config
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── dist/                # Build output
│   ├── code.js         # Compiled code
│   └── ui.html         # Copied UI
└── docs/                # Documentation
    ├── MASTER_PLAN.md
    ├── WEEK1_IMPLEMENTATION.md
    ├── CONTEXT_REFERENCE.md (this file)
    └── [other docs]
```

### Key Components
1. **Analysis Engine** (code.ts)
   - Frame selection monitoring
   - WCAG compliance checking (5 check types)
   - Hash generation for change detection
   - Cache management (memory + PluginData)
   - History storage (Figma root plugin data)

2. **UI Layer** (ui.html)
   - Tab-based navigation (Analyze, History, Settings)
   - Collapsible "What to Check" section on Analyze tab
   - Overlay toggle on Analyze tab
   - Results display with issue cards
   - Settings configuration
   - Shadcn-inspired styling

3. **Storage**
   - **Cache:** Frame-level PluginData + memory Map
   - **History:** Root-level PluginData (last 50 analyses)
   - **Settings:** Root-level PluginData

---

## 🎯 Core Features (Current Status)

### ✅ What's Working
- ✅ **Color contrast checking** (WCAG 2.0/2.1/2.2)
- ✅ **Text spacing validation** (WCAG 2.1+)
- ✅ **Line height checking**
- ✅ **Paragraph spacing**
- ✅ **Non-text contrast** (WCAG 2.1+)
- ✅ **Visual overlays** with toggle on Analyze tab
- ✅ **One-click fixes** for all issue types
- ✅ **Analysis history** (local, last 50)
- ✅ **2-level caching** (memory + PluginData)
- ✅ **Settings panel** with WCAG version selector
- ✅ **Collapsible checks section** on Analyze tab
- ✅ **Loading states** with progress bar
- ✅ **Empty states** for no issues/no history
- ✅ **Error handling** with toast notifications
- ✅ **Shadcn-inspired UI** with proper styling

### ⚠️ What's NOT Working / Needs Work
- ⚠️ WCAG version thresholds not fully applied (UI exists, logic needs enhancement)
- ⚠️ Onboarding flow (not implemented)
- ⚠️ Stripe integration (not implemented)
- ⚠️ Supabase backend (removed - using local storage only)
- ⚠️ DeepSeek AI (removed due to billing issues)
- ⚠️ Team collaboration (future feature)

---

## 🖥️ UI Layout (Current)

### Analyze Tab
```
┌────────────────────────────────────┐
│ 🎯 A11y Audit Pro                  │
│ Free Plan                          │
├────────────────────────────────────┤
│ [Analyze] [History] [Settings]     │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ 📄 Frame Name                  │ │
│ │ Ready to analyze / Has results │ │
│ └────────────────────────────────┘ │
│                                    │
│ ┌─────────────────────────────── ┐│
│ │▼ 🎨 What to Check              ││
│ │  ☑ Color Contrast              ││
│ │  ☑ Text Spacing                ││
│ │  ☑ Line Height                 ││
│ │  ☑ Paragraph Spacing           ││
│ │  ☑ Non-text Contrast           ││
│ └────────────────────────────────┘│
│                                    │
│ ☑ Show Visual Overlays            │
│                                    │
│ [ 🔍 Analyze Frame ]               │
│                                    │
│ ┌─ Results ─────────────────────┐ │
│ │ [5 Critical] [3 Warnings]     │ │
│ │                               │ │
│ │ Issue cards here...           │ │
│ └───────────────────────────────┘ │
└────────────────────────────────────┘
```

### Settings Tab
```
┌────────────────────────────────────┐
│ 📋 WCAG Standard                   │
│ Version: [WCAG 2.1 ▼]             │
│ Level: [AA ▼]                     │
│ ℹ️ Description box                │
├────────────────────────────────────┤
│ 🎯 Display Options                 │
│ ☑ Group Issues by Element         │
│ ☐ Show Only Failing Checks        │
│ Overlay Brightness: [====●===] 70%│
├────────────────────────────────────┤
│ 💾 Saved Results                   │
│ Keep results for: [1 week ▼]      │
│ ℹ️ Info about saved results       │
│ [🗑️ Clear All Saved Results]      │
├────────────────────────────────────┤
│ [ 💾 Save Settings ]               │
└────────────────────────────────────┘
```

---

## 💰 Pricing Strategy

### Tiers (Planned)
1. **Free:** $0/month
   - 10 frame analyses/month
   - Basic WCAG 2.2 AA checks
   - No history sync, no AI, no collaboration

2. **Pro:** $9/month ($90/year)
   - Unlimited analyses
   - Full WCAG 2.0/2.1/2.2 AA & AAA
   - Persistent history
   - Export reports

3. **Team:** $29/month for 5 seats ($290/year)
   - Everything in Pro
   - Team collaboration
   - Shared workspace

### Competitor Pricing
- **Stark:** $12/mo (Pro), $15/seat (Team)
- **Include:** ~$10/mo
- **A11y:** Free (limited)
- **BrowserStack:** Free

### Our Advantage
- 25% cheaper than Stark ($9 vs $12)
- Better free plan (10 analyses vs limited features)
- WCAG version switching (unique feature)
- Affordable team pricing ($5.80/seat vs Stark's $15/seat)

---

## 📊 Competitive Analysis Summary

### Main Competitors
1. **Stark** - Market leader (390k users)
2. **A11y** - Popular free plugin
3. **Include** - Paid alternative
4. **BrowserStack Toolkit** - Free, basic

### Our Unique Features
1. **WCAG version switching** - Only plugin with 2.0/2.1/2.2 toggle
2. **Best price-to-value** - More features, lower cost
3. **Team collaboration** - Affordable ($29 for 5 vs $75 for 5)
4. **Frame-level analysis** - Not just components
5. **One-click fixes** - Instant issue resolution

---

## 🛠️ Technology Stack

### Frontend
- **Language:** TypeScript (code.ts) + JavaScript (ui.html)
- **UI:** HTML/CSS/JavaScript
- **Styling:** CSS variables (Shadcn-inspired palette)
- **Components:** Custom (buttons, cards, badges, toasts, collapsibles)

### Storage
- **Cache:** Figma PluginData (per-frame)
- **History:** Figma root PluginData
- **Settings:** Figma root PluginData

### Build Tools
- **Compiler:** TypeScript (tsc)
- **Scripts:**
  - `npm run build` - Compile + copy UI
  - `npm run watch` - Auto-rebuild

---

## 📝 Key UI Terminology (User-Friendly)

| Technical Term | User-Facing Term |
|---------------|------------------|
| Cache | Saved Results |
| Cache TTL | Keep results for |
| Clear Cache | Clear All Saved Results |
| Overlay Opacity | Overlay Brightness |
| Checks to Perform | What to Check |
| Cache Settings | Saved Results |

---

## 🔍 WCAG Standards Reference

### WCAG 2.0 AA (2008)
- Color contrast: 4.5:1 (normal text), 3:1 (large text)
- No text spacing requirements
- No non-text contrast requirements

### WCAG 2.1 AA (2018)
- Same as 2.0 AA, plus:
- Text spacing: 0.12em letter spacing, 1.5x line height
- Non-text contrast: 3:1
- Touch targets: 44×44px (guideline)

### WCAG 2.2 AA (2023)
- Same as 2.1 AA, plus:
- Focus appearance: 2px minimum, 3:1 contrast
- Target size (minimum): 24×24px

### AAA Levels
- Normal text: 7:1 (vs 4.5:1 for AA)
- Large text: 4.5:1 (vs 3:1 for AA)

---

## 🚫 Known Issues & Limitations

### Current Limitations
- No touch target checking (planned)
- No focus order checking (planned)
- No keyboard navigation audit (planned)
- No ARIA label checking (planned)
- No landmark detection (planned)
- WCAG thresholds not yet version-specific in analysis logic
- No cloud sync (local storage only)

### Removed Features
- **Supabase backend** - Removed for simplicity
- **DeepSeek AI** - Removed due to billing issues

---

## 📚 Key Documentation Files

### For Development
- **MASTER_PLAN.md** - Complete product & launch plan
- **WEEK1_IMPLEMENTATION.md** - Step-by-step code guide
- **THIS FILE** - Context & facts reference

### For Reference
- **ARCHITECTURE.md** - Technical architecture details
- **TROUBLESHOOTING.md** - Common issues and fixes

---

## ❓ Common Questions (for AI assistants)

### Q: What's the plugin called?
A: **A11y Audit Pro** (or AccessFlow Pro as backup)

### Q: What does it do?
A: Checks Figma frames for WCAG 2.0/2.1/2.2 accessibility compliance with one-click fixes

### Q: Is it free?
A: Currently free during development. Planned: Freemium with 10 analyses/month free, Pro at $9/month

### Q: How is it different from Stark?
A: Cheaper ($9 vs $12), has WCAG version switching (unique), better team pricing

### Q: What's the tech stack?
A: TypeScript, HTML/CSS/JS (Figma Plugin API), Figma PluginData for storage

### Q: Is it launched yet?
A: No - in development, core features working

### Q: What's implemented?
A: Core analysis, caching, history, settings panel, UI polish. Need: Onboarding, Stripe

### Q: Where is the overlay toggle?
A: On the Analyze tab, above the Analyze button

### Q: Where are the check options?
A: In a collapsible "What to Check" section on the Analyze tab (open by default)

---

## 🔄 Recent Changes (November 26, 2025)

### Fixed Issues
1. ✅ Analysis now working properly with comprehensive logging
2. ✅ Frame count only increases after successful analysis
3. ✅ Frame name displays correctly (just name, no properties)
4. ✅ History tab loads within 3 seconds (has timeout fallback)
5. ✅ Cache terminology simplified ("Saved Results")
6. ✅ Checks section on Analyze tab with collapsible chevron
7. ✅ Overlay toggle moved to Analyze tab

### UI Improvements
- Collapsible "What to Check" section (remembers state)
- Overlay toggle directly on Analyze page
- Simpler terminology throughout
- Better loading/empty states

---

## ✅ Document Maintenance

### When to Update This Document
- [ ] Major feature added/removed
- [ ] UI layout changed significantly
- [ ] Pricing changed
- [ ] Bug fixes that affect user experience
- [ ] Terminology changes

### Last Changes
- November 26, 2025: Updated for bug fixes and UI improvements

---

**END OF CONTEXT REFERENCE**

*Keep this document up-to-date. It's your source of truth.*

# 🧠 Context Reference - Anti-Hallucination Guide

**Purpose:** This document contains all critical facts about the plugin to maintain context in long conversations and prevent AI hallucination.

**Last Updated:** November 14, 2025

---

## 📌 Plugin Core Facts

### Identity
- **Name:** A11y Audit Pro (recommended) or AccessFlow Pro (backup)
- **Full Marketplace Name:** A11y Audit Pro - WCAG 2.2 Accessibility Checker
- **Current Version:** 1.0.0
- **Status:** Pre-marketplace (development)
- **Technology:** TypeScript + HTML/CSS/JS (Figma Plugin API)

### Purpose
Comprehensive WCAG 2.0/2.1/2.2 accessibility checker for Figma frames with AI-powered fixes and team collaboration

---

## 🏗️ Technical Architecture (Simplified)

### File Structure
```
Frame-Accessibility-Audit/
├── code.ts              # Main plugin logic (sandbox)
├── ui.html              # Plugin UI (iframe)
├── manifest.json        # Figma plugin config
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── dist/                # Build output
│   ├── code.js         # Compiled code
│   └── ui.html         # Copied UI
└── docs/                # Documentation
    ├── MASTER_PLAN.md
    ├── WEEK1_IMPLEMENTATION.md
    ├── ARCHITECTURE.md
    └── [other docs]
```

### Key Components
1. **Analysis Engine** (code.ts)
   - Frame selection monitoring
   - WCAG compliance checking
   - Hash generation for change detection
   - Cache management (3 levels)

2. **UI Layer** (ui.html)
   - Tab-based navigation (Analyze, History, Settings)
   - Results display
   - Settings configuration
   - Onboarding flow

3. **Backend** (Supabase)
   - PostgreSQL database
   - Row-level security (RLS)
   - Analysis history storage
   - Change tracking

---

## 🎯 Core Features (Current)

### What's Working
- ✅ Color contrast checking (WCAG 2.0/2.1/2.2)
- ✅ Text spacing validation (WCAG 2.1+)
- ✅ Line height checking
- ✅ Paragraph spacing
- ✅ Non-text contrast (WCAG 2.1+)
- ✅ Visual overlays
- ✅ One-click fixes
- ✅ Persistent history (Supabase)
- ✅ 3-level caching (memory + PluginData + Supabase)

### What's NOT Working / Needs Work
- ⚠️ WCAG version switching (not implemented)
- ⚠️ Settings panel (not implemented)
- ⚠️ Onboarding flow (not implemented)
- ⚠️ UI change detection with alerts (not implemented)
- ⚠️ Stripe integration (not implemented)
- ⚠️ Shadcn UI styling (not implemented)
- ⚠️ DeepSeek AI (has billing issue)

---

## 💰 Pricing Strategy

### Tiers
1. **Free:** $0/month
   - 10 frame analyses/month
   - Basic WCAG 2.2 AA checks
   - No history, no AI, no collaboration

2. **Pro:** $9/month ($90/year)
   - Unlimited analyses
   - Full WCAG 2.0/2.1/2.2 AA & AAA
   - Persistent history
   - AI suggestions
   - Export reports

3. **Team:** $29/month for 5 seats ($290/year)
   - Everything in Pro
   - Team collaboration
   - Shared workspace
   - Assign issues
   - Analytics dashboard

4. **Enterprise:** Custom pricing ($500+/month)
   - Unlimited seats
   - Custom integrations
   - SSO
   - White-label
   - SLA

### Competitor Pricing
- **Stark:** $12/mo (Pro), $15/seat (Team)
- **Include:** ~$10/mo
- **A11y:** Free (limited)
- **BrowserStack:** Free

### Our Advantage
- 25% cheaper than Stark
- Better free plan (10 analyses vs limited features)
- WCAG version switching (unique feature)
- Affordable team pricing ($5.80/seat vs Stark's $15/seat)

---

## 🎨 UI Improvements Needed

### Current UI Problems
- Plain buttons (no styling)
- No consistent design system
- No loading states
- No empty states
- No error handling UI
- No dark mode

### Solution: Shadcn UI
- **Technology:** Tailwind CSS + Radix primitives
- **Approach:** Copy-paste components (not npm)
- **Components Needed:**
  - Button (primary, secondary, ghost)
  - Card (header, content, footer)
  - Badge (success, warning, error)
  - Select/Dropdown
  - Progress bar
  - Toast notifications
  - Slider
  - Checkbox/Toggle

---

## 📊 Competitive Analysis Summary

### Main Competitors
1. **Stark** - Market leader (390k users)
2. **A11y** - Popular free plugin
3. **Include** - Paid alternative
4. **BrowserStack Toolkit** - Free, basic

### Our Unique Features
1. **WCAG version switching** - Only plugin with 2.0/2.1/2.2 toggle
2. **AI-powered fixes** - Plain English suggestions
3. **Best price-to-value** - More features, lower cost
4. **Team collaboration** - Affordable ($29 for 5 vs $75 for 5)
5. **Frame-level analysis** - Not just components

### What We Don't Compete On
- ❌ Cross-platform (Figma only)
- ❌ Browser extension
- ❌ GitHub integration (not yet)
- ❌ Enterprise certifications (not yet)

---

## 🚀 Launch Strategy

### Pre-Launch (4 weeks)
1. Week 1: Core features (WCAG switching, Settings, Detection)
2. Week 2: Monetization (Stripe) + Onboarding
3. Week 3: UI/UX polish (Shadcn)
4. Week 4: Submission + Launch

### Launch Channels
1. Figma Marketplace (organic)
2. Product Hunt
3. Twitter/LinkedIn
4. Design blogs/newsletters
5. Beta user referrals

### Success Metrics
- **Goal:** 1,000 users in 3 months
- **Conversion:** 15% Free → Pro
- **MRR Target:** $2,800 by month 3

---

## 🛠️ Technology Stack

### Frontend
- **Language:** TypeScript
- **UI:** HTML/CSS/JavaScript (no React in Figma plugins)
- **Styling:** Tailwind CSS (via CDN)
- **Components:** Shadcn-inspired (copy-paste)

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Figma User ID (no separate auth)
- **Payments:** Stripe
- **Hosting:** N/A (runs in Figma)

### Build Tools
- **Compiler:** TypeScript (tsc)
- **Bundler:** None (direct compilation)
- **Scripts:**
  - `npm run build` - Compile + copy UI
  - `npm run watch` - Auto-rebuild

---

## 📝 Development Priorities (This Week)

### Priority 1: WCAG Version Switching
- Add version selector UI
- Define thresholds per version
- Apply correct thresholds in analysis
- Save/load preference

### Priority 2: Settings Panel
- Create settings tab
- WCAG standard selector
- Check toggles
- Display preferences
- Cache management
- Save/load logic

### Priority 3: UI Change Detection
- Monitor frame modifications
- Generate content hashes
- Compare with cached hash
- Show alert on change
- Auto-prompt re-analysis

### Priority 4: Onboarding Flow
- 5-screen wizard
- Skip/resume capability
- First-run detection
- Analytics tracking

### Priority 5: Stripe Integration
- Create Stripe account
- Set up products/prices
- Checkout flow
- Webhook handler
- License validation

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
- Touch targets: 44×44px (guideline, not requirement)

### WCAG 2.2 AA (2023)
- Same as 2.1 AA, plus:
- Focus appearance: 2px minimum, 3:1 contrast
- Dragging movements (alt required)
- Target size (minimum): 24×24px

### AAA Levels
- Normal text: 7:1 (vs 4.5:1 for AA)
- Large text: 4.5:1 (vs 3:1 for AA)
- Enhanced requirements for all checks

---

## 💾 Database Schema (Supabase)

### Tables
1. **frame_analyses**
   - id (uuid)
   - frame_id (text)
   - user_id (text)
   - content_hash (text)
   - analysis_data (jsonb) - Contains issues array
   - analyzed_at (timestamp)
   - RLS: user_id filter

2. **frame_changes**
   - id (uuid)
   - frame_id (text)
   - previous_hash (text)
   - current_hash (text)
   - is_resolved (boolean)
   - detected_at (timestamp)
   - resolved_at (timestamp)
   - RLS: user_id filter

3. **analysis_sessions**
   - id (uuid)
   - user_id (text)
   - session_start (timestamp)
   - session_end (timestamp)
   - frame_count (integer)
   - RLS: user_id filter

---

## 🚫 Known Issues & Limitations

### Current Bugs
- None critical (stable foundation)

### Limitations
- No touch target checking (coming)
- No focus order checking (coming)
- No keyboard navigation audit (coming)
- No aria label checking (coming)
- No landmark detection (coming)

### DeepSeek AI Issue
- Status: Has 402 billing error
- Impact: AI suggestions not working
- Temporary Solution: Remove AI code or fix billing
- Recommended: Remove for now, add back later

---

## 📚 Key Documentation Files

### For Development
- **MASTER_PLAN.md** - Complete product & launch plan
- **WEEK1_IMPLEMENTATION.md** - Step-by-step code guide
- **ARCHITECTURE.md** - Technical architecture details
- **THIS FILE** - Context & facts reference

### For Users (Future)
- USER_GUIDE.md
- FAQ.md
- TROUBLESHOOTING.md
- API_DOCS.md

---

## 🎯 Marketing Positioning

### Tagline
"Make Your Figma Designs Accessible for Everyone"

### Elevator Pitch (30 seconds)
"A11y Audit Pro is the most comprehensive WCAG accessibility checker for Figma. Unlike other tools, we support WCAG 2.0, 2.1, AND 2.2 with version switching, making it perfect for projects with different compliance requirements. We're 25% cheaper than Stark, with AI-powered suggestions and affordable team pricing. Trusted by [X] designers at [Company Names]."

### Key Messages
1. **Comprehensive:** WCAG 2.0/2.1/2.2 support (only plugin with switching)
2. **Affordable:** $9/mo vs Stark's $12/mo (25% cheaper)
3. **Team-Friendly:** $29 for 5 seats vs $75 (Stark)
4. **AI-Powered:** Plain English suggestions, no expertise needed
5. **Fast:** Intelligent caching, instant re-analysis

---

## 🔐 Security & Privacy

### Data Handling
- User ID: Figma-provided (no separate auth)
- Analysis data: Stored in Supabase with RLS
- No personal data collected beyond Figma ID
- No tracking beyond usage analytics

### Payment Security
- Stripe handles all payment processing
- No credit card data stored on our servers
- PCI compliance via Stripe

---

## 📈 Success KPIs

### Acquisition
- Users: 1,000 in 3 months
- Daily signups: 10-15
- Activation rate: 70% (run first analysis)

### Engagement
- Analyses per user: 5+/month
- Retention rate: 50%+ (30 days)
- Session length: 5-10 minutes

### Monetization
- Free → Pro conversion: 15%
- Pro users: 150 by month 3
- Team users: 50 licenses by month 3
- MRR: $2,800 by month 3
- Churn: < 2%/month

### Satisfaction
- Figma rating: 4.5+ stars
- Support tickets: < 5/week
- NPS score: 40+

---

## ❓ Common Questions (for AI assistants)

### Q: What's the plugin called?
A: **A11y Audit Pro** (or AccessFlow Pro as backup)

### Q: What does it do?
A: Checks Figma frames for WCAG 2.0/2.1/2.2 accessibility compliance

### Q: Is it free?
A: Freemium - Free plan with 10 analyses/month, Pro at $9/month

### Q: How is it different from Stark?
A: Cheaper ($9 vs $12), has WCAG version switching (unique), better team pricing

### Q: What's the tech stack?
A: TypeScript, HTML/CSS/JS (Figma Plugin API), Supabase (backend), Stripe (payments)

### Q: Is it launched yet?
A: No - in development, targeting launch in 4 weeks

### Q: What's implemented?
A: Core analysis, caching, history. Need: WCAG switching, settings, onboarding, Stripe, UI polish

### Q: What's the biggest priority?
A: Week 1: WCAG switching + Settings + Change detection (see WEEK1_IMPLEMENTATION.md)

---

## 🔄 How to Use This Document

### For AI Assistants
- Read this FIRST in long conversations
- Reference specific sections when answering questions
- Cite this document when stating facts
- Update this document when facts change

### For Developers
- Use as quick reference
- Check when uncertain about decisions
- Update after major changes
- Keep facts accurate and current

### For Product Managers
- Use for pitches and presentations
- Check positioning and messaging
- Verify competitive claims
- Track KPIs against targets

---

## ✅ Document Maintenance

### When to Update
- [ ] Plugin renamed
- [ ] Major feature added/removed
- [ ] Pricing changed
- [ ] Competitor landscape shifts
- [ ] Launch date changed
- [ ] Tech stack modified
- [ ] Database schema updated

### Last Changes
- November 14, 2025: Initial creation

---

**END OF CONTEXT REFERENCE**

*Keep this document up-to-date. It's your source of truth.*

# 🚀 Testing & Deployment Guide - A11y Audit Pro

## ⚠️ IMPORTANT: Read This Before Publishing

Your plugin is **already published**, so you need to **test thoroughly** before updating the live version.

---

## 📋 **Testing Checklist (Do This First!)**

### **Step 1: Build the Enhanced Version**

```bash
cd Frame-Accessibility-Audit

# Replace old code with enhanced version
cp code-enhanced.ts code.ts

# Build
npm run build

# Verify build succeeded
ls dist/
# Should see: code.js, ui.html
```

---

### **Step 2: Test in Development Mode**

**In Figma Desktop:**

1. **Load as Development Plugin:**
   - Plugins → Development → "A11y Audit Pro" (your existing dev version)
   - Right-click → **"Reload plugin"**
   - OR: Remove and re-import from manifest

2. **Run Initial Test:**
   ```
   ✓ Plugin loads without errors
   ✓ No console errors (check DevTools)
   ✓ UI appears correctly
   ```

---

### **Step 3: Test All New Features**

#### ✅ **Test 1: Onboarding Flow**

```javascript
// Reset onboarding (in browser console):
localStorage.removeItem('a11y-onboarding-completed')

// Then reload plugin
```

**Expected Behavior:**
- ✓ Screen 1: Welcome appears
- ✓ Can click "Get Started"
- ✓ Screen 2: How it works
- ✓ Screen 3: WCAG version selection (can select)
- ✓ Screen 4: Try it now (can analyze if frame selected)
- ✓ Screen 5: Pricing (shows plans)
- ✓ Can skip at any time
- ✓ After completion, main app shows
- ✓ Onboarding doesn't repeat on reload

**If Issues:**
- Check browser console for errors
- Verify localStorage is working
- Check if screens are rendering

---

#### ✅ **Test 2: WCAG Version Switching**

**Test Steps:**

1. Go to Settings tab
2. Note current version (should be 2.1 AA)
3. Select a frame with text
4. Analyze it
5. Note the results (should include text spacing checks)
6. Change to WCAG 2.0 AA
7. Click "Save Settings"
8. Re-analyze the same frame
9. **Expected:** No text spacing checks this time!
10. Change to WCAG 2.2 AAA
11. Re-analyze
12. **Expected:** Stricter contrast requirements (7:1 instead of 4.5:1)

**Verify:**
```
WCAG 2.0 AA:
✓ Color contrast only
✗ NO text spacing checks
✗ NO non-text contrast checks

WCAG 2.1 AA:
✓ Color contrast
✓ Text spacing (0.12em)
✓ Non-text contrast (3:1)

WCAG 2.2 AAA:
✓ All 2.1 checks
✓ Stricter contrast (7:1 for normal text)
```

---

#### ✅ **Test 3: Change Detection**

**Test Steps:**

1. Select a frame
2. Analyze it
3. **Modify the frame:**
   - Change text content
   - OR change text color
   - OR add/remove an element
4. Click on the frame again (re-select it)
5. **Expected:** Yellow warning banner appears:
   ```
   ⚠️ Frame Modified
   This frame has been changed since last analysis.
   [Re-analyze Now] [Dismiss]
   ```
6. Click "Re-analyze Now"
7. **Expected:** Fresh analysis runs

**Verify:**
- ✓ Alert appears after modification
- ✓ Alert doesn't appear if frame unchanged
- ✓ "Dismiss" hides the alert
- ✓ "Re-analyze" triggers new analysis

---

#### ✅ **Test 4: Settings Persistence**

**Test Steps:**

1. Open Settings tab
2. Change settings:
   - WCAG version: 2.2 AAA
   - Disable "Text Spacing" check
   - Change overlay opacity: 50%
   - Cache TTL: 14 days
3. Click "Save Settings"
4. **Close the plugin completely**
5. Reopen the plugin
6. Go to Settings tab
7. **Expected:** All settings are saved!

**Verify:**
- ✓ WCAG version persisted
- ✓ Check toggles persisted
- ✓ Opacity value persisted
- ✓ Cache TTL persisted

---

#### ✅ **Test 5: Enhanced UI Components**

**Visual Check:**

- ✓ Buttons have proper styling (primary = black, secondary = outlined)
- ✓ Buttons have hover effects
- ✓ Cards have proper borders and shadows
- ✓ Badges show correct colors (green, yellow, red)
- ✓ Toast notifications appear and auto-hide
- ✓ Loading spinners work
- ✓ Empty states display correctly

---

#### ✅ **Test 6: Login/Signup Screens**

**Test Steps:**

1. Clear auth state:
   ```javascript
   localStorage.removeItem('a11y-auth-checked')
   localStorage.removeItem('a11y-onboarding-completed')
   ```
2. Reload plugin
3. Complete onboarding
4. Should see login screen
5. Try switching to signup
6. Try "Sign in with Figma" button

**Verify:**
- ✓ Login form displays
- ✓ Can switch to signup
- ✓ Form validation works
- ✓ "Sign in with Figma" shows message (not implemented yet)

---

#### ✅ **Test 7: Pricing Screen**

**Test Steps:**

1. In main app, click "Upgrade" button in header
2. Pricing screen appears
3. Check all 4 plans are visible
4. Try clicking different plan buttons

**Verify:**
- ✓ All plans display correctly
- ✓ Prices are accurate
- ✓ Features are listed
- ✓ "Current Plan" badge shows for Free
- ✓ Can close pricing screen

---

#### ✅ **Test 8: Free Plan Limit** (Optional)

**Test Steps:**

1. In `ui.html`, temporarily change:
   ```javascript
   let analysisLimit = 2;  // Instead of 10
   ```
2. Rebuild: `npm run build`
3. Reload plugin
4. Run 3 analyses
5. **Expected:** After 2nd analysis, upgrade prompt shows

---

### **Step 4: Edge Case Testing**

#### Test with Different Frame Sizes:

```
✓ Empty frame (0 elements)
✓ Small frame (1-10 elements)
✓ Medium frame (50-100 elements)
✓ Large frame (500+ elements)
✓ Huge frame (1000+ elements - should show progress)
```

#### Test Error Handling:

```
✓ No frame selected → "Select a frame" message
✓ Multiple frames selected → "Select only one" message
✓ Invalid font → Graceful fallback
✓ Missing fills → No crash
```

#### Test Browser Compatibility:

```
✓ Chrome (Figma Desktop on Windows)
✓ Safari (Figma Desktop on Mac)
✓ Figma Web (if supported)
```

---

## ✅ **If All Tests Pass**

### **Step 5: Prepare for Publishing**

1. **Update Version Number:**
   - ✅ Already done! (manifest.json now has version: "1.1.0")

2. **Update Release Notes:**

Create a file: `RELEASE_NOTES_v1.1.0.md`

```markdown
# Version 1.1.0 - Major Update 🎉

## New Features

### 🎯 Onboarding Flow
- 5-screen guided tour for new users
- Interactive WCAG version selection
- "Try It Now" feature showcase

### ⚙️ Settings Panel
- **WCAG Version Switching** - Choose between 2.0/2.1/2.2
- **AA/AAA Level Selection** - Adjust compliance strictness
- Enable/disable individual checks
- Display preferences
- Cache management

### 🔍 Change Detection
- Real-time frame monitoring
- Automatic alerts when frames are modified
- One-click re-analysis

### 🎨 Enhanced UI/UX
- Professional Shadcn-inspired design
- Beautiful buttons, cards, and badges
- Toast notifications
- Loading and empty states
- Improved accessibility (ironic, we know!)

### 💰 Pricing & Plans
- Clear pricing display
- Free plan: 10 analyses/month
- Pro plan: $9/month (unlimited)
- Team plan: $29/month for 5 seats

### 🔐 Login/Signup (UI Ready)
- Professional authentication screens
- Figma OAuth integration (coming soon)

## Improvements

- ✅ Settings now persist across sessions
- ✅ WCAG thresholds dynamically adjust based on selected version
- ✅ Better error handling
- ✅ Improved performance
- ✅ Cleaner code structure

## Bug Fixes

- Fixed cache invalidation logic
- Improved font loading fallbacks
- Better handling of mixed fonts

## What's Next

- Stripe integration for payments
- Supabase for persistent history
- Team collaboration features
- AI-powered suggestions
```

---

### **Step 6: Publish Update**

#### **Option A: Figma Desktop App**

1. **In Figma Desktop:**
   - Plugins → Development → Your plugin
   - Right-click → **"Publish new version"**
   
2. **Fill in Update Form:**
   - Version: `1.1.0`
   - Release notes: (paste from above)
   - Screenshot updates (optional but recommended)
   
3. **Submit for Review**
   - Figma will review (usually 1-3 business days)
   - You'll get email notification

#### **Option B: Figma Website**

1. Go to: https://www.figma.com/community/plugins/YOUR_PLUGIN_ID/edit
2. Click "Publish new version"
3. Upload files or link to GitHub
4. Add release notes
5. Submit

---

### **Step 7: Post-Publishing**

1. **Monitor for Issues:**
   - Check Figma plugin reviews
   - Monitor support emails
   - Watch for crash reports

2. **Announce Update:**
   ```
   Twitter: "Just launched v1.1.0 of A11y Audit Pro! 🎉
   ✨ WCAG version switching
   ✨ Enhanced UI/UX
   ✨ Onboarding flow
   Try it now: [link]"
   
   LinkedIn: Similar announcement
   Product Hunt: Update your listing
   ```

3. **Update Documentation:**
   - Update README.md
   - Update website (if any)
   - Create tutorial videos

---

## 🐛 **Common Issues & Solutions**

### Issue 1: "Build fails"

```bash
# Solution:
rm -rf dist/
rm -rf node_modules/
npm install
npm run build
```

### Issue 2: "Plugin won't reload"

```bash
# Solution:
# In Figma:
# 1. Remove the development plugin completely
# 2. Re-import from manifest.json
```

### Issue 3: "Settings don't save"

```javascript
// Check in browser console:
localStorage.getItem('a11y-settings')
// Should return JSON string

// If null, check:
// - Figma clientStorage quota
// - saveSettings() is being called
// - No errors in console
```

### Issue 4: "Onboarding keeps showing"

```javascript
// Fix:
localStorage.setItem('a11y-onboarding-completed', 'true')
```

### Issue 5: "Change detection not working"

```
// Check:
1. Frame was analyzed at least once
2. Modifications are significant (not just position)
3. Hash generation is working (check console logs)
4. lastFrameHashes Map is populated
```

---

## 📊 **Pre-Publish Checklist**

Before submitting update:

### Code Quality:
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All TODO comments addressed (or noted for next version)
- [ ] Code is commented
- [ ] Performance is acceptable

### Features:
- [ ] Onboarding works
- [ ] WCAG switching works
- [ ] Settings persist
- [ ] Change detection works
- [ ] UI components render correctly
- [ ] All tabs accessible

### Testing:
- [ ] Tested on Mac (if possible)
- [ ] Tested on Windows
- [ ] Tested with different frame sizes
- [ ] Tested edge cases
- [ ] No crashes

### Documentation:
- [ ] README updated
- [ ] Release notes written
- [ ] Version number incremented
- [ ] manifest.json updated

### Publishing:
- [ ] Screenshots updated (optional)
- [ ] Description updated (optional)
- [ ] Tags/categories updated (optional)

---

## 🎯 **Deployment Steps Summary**

```bash
# 1. BUILD
cp code-enhanced.ts code.ts
npm run build

# 2. TEST (in Figma Desktop - Development mode)
# - Run all tests from checklist above
# - Fix any issues
# - Repeat until all tests pass

# 3. PUBLISH (when ready)
# - Figma Desktop → Plugins → Development → Publish new version
# - Add release notes
# - Submit for review

# 4. MONITOR
# - Watch for reviews
# - Monitor errors
# - Respond to feedback
```

---

## ⚠️ **Important Notes**

1. **Users won't see changes until you publish** - Development mode is only for you
2. **Figma review takes 1-3 business days** - Plan accordingly
3. **Can't rollback easily** - Test thoroughly first!
4. **Backend features won't work yet** - Stripe, auth, etc. need APIs
5. **Consider beta testing** - Share dev version with trusted users first

---

## 🚀 **Ready to Publish?**

**If all tests pass:**
✅ Build is successful  
✅ All features work  
✅ No console errors  
✅ Settings persist  
✅ UI looks professional  
✅ Release notes ready  

**Then:** Publish the update! 🎉

**If any tests fail:**
❌ Fix the issues first  
❌ Don't publish broken code  
❌ Test again after fixes  

---

## 📞 **Need Help?**

**Check:**
- Browser console for errors
- Figma plugin console
- Documentation files

**Common Solutions:**
- Rebuild: `npm run build`
- Clear cache: `localStorage.clear()`
- Reload plugin in Figma

---

**Good luck with testing! Let me know if you run into any issues! 🚀**

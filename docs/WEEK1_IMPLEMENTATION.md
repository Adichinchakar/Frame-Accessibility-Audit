# 🛠️ Implementation Guide - Week 1 Sprint

**Goal:** Implement 5 critical features for marketplace launch

---

## Day 1-2: WCAG Version Switching

### Step 1: Update Settings Interface
```typescript
// Add to your settings type
interface WCAGSettings {
  version: '2.0' | '2.1' | '2.2';
  level: 'AA' | 'AAA';
}
```

### Step 2: Define Thresholds
```typescript
// Create: src/wcag-thresholds.ts
export const WCAG_THRESHOLDS = {
  '2.0': {
    AA: {
      colorContrast: {
        normalText: 4.5,
        largeText: 3.0,
      },
      nonTextContrast: 0, // Not in WCAG 2.0
    },
    AAA: {
      colorContrast: {
        normalText: 7.0,
        largeText: 4.5,
      },
      nonTextContrast: 0,
    },
  },
  '2.1': {
    AA: {
      colorContrast: {
        normalText: 4.5,
        largeText: 3.0,
      },
      nonTextContrast: 3.0, // NEW in 2.1
      textSpacing: {
        letterSpacing: 0.12,
        lineHeight: 1.5,
        paragraphSpacing: 2.0,
      },
    },
    AAA: {
      colorContrast: {
        normalText: 7.0,
        largeText: 4.5,
      },
      nonTextContrast: 3.0,
      textSpacing: {
        letterSpacing: 0.12,
        lineHeight: 1.5,
        paragraphSpacing: 2.0,
      },
    },
  },
  '2.2': {
    AA: {
      colorContrast: {
        normalText: 4.5,
        largeText: 3.0,
      },
      nonTextContrast: 3.0,
      textSpacing: {
        letterSpacing: 0.12,
        lineHeight: 1.5,
        paragraphSpacing: 2.0,
      },
      // NEW in 2.2
      focusAppearance: {
        minSize: 2, // pixels
        minContrast: 3.0,
      },
    },
    AAA: {
      colorContrast: {
        normalText: 7.0,
        largeText: 4.5,
      },
      nonTextContrast: 3.0,
      textSpacing: {
        letterSpacing: 0.12,
        lineHeight: 1.5,
        paragraphSpacing: 2.0,
      },
      focusAppearance: {
        minSize: 2,
        minContrast: 4.5, // Stricter for AAA
      },
    },
  },
};
```

### Step 3: Add Settings UI
```html
<!-- In ui.html, Settings section -->
<div class="settings-section">
  <h3>WCAG Standard</h3>
  
  <label>
    <span>Version:</span>
    <select id="wcag-version">
      <option value="2.0">WCAG 2.0</option>
      <option value="2.1" selected>WCAG 2.1</option>
      <option value="2.2">WCAG 2.2</option>
    </select>
  </label>
  
  <label>
    <span>Level:</span>
    <select id="wcag-level">
      <option value="AA" selected>AA (Minimum)</option>
      <option value="AAA">AAA (Enhanced)</option>
    </select>
  </label>
  
  <div class="info-box">
    <p id="wcag-description">
      <!-- Dynamic description based on selection -->
    </p>
  </div>
</div>

<style>
.settings-section {
  padding: 1rem;
  border-bottom: 1px solid #e5e5e5;
}

.settings-section label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.settings-section select {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.info-box {
  background: #f0f9ff;
  border-left: 3px solid #3b82f6;
  padding: 0.75rem;
  margin-top: 1rem;
  font-size: 0.875rem;
}
</style>

<script>
const wcagDescriptions = {
  '2.0-AA': 'Most widely supported. Required for US Section 508 compliance.',
  '2.0-AAA': 'Enhanced accessibility. Stricter contrast requirements.',
  '2.1-AA': 'Recommended. Includes mobile and touch accessibility.',
  '2.1-AAA': 'Enhanced mobile accessibility with stricter requirements.',
  '2.2-AA': 'Latest standard (2023). Includes focus appearance and more.',
  '2.2-AAA': 'Strictest requirements. Future-proof your designs.',
};

document.getElementById('wcag-version').addEventListener('change', updateDescription);
document.getElementById('wcag-level').addEventListener('change', updateDescription);

function updateDescription() {
  const version = document.getElementById('wcag-version').value;
  const level = document.getElementById('wcag-level').value;
  const key = `${version}-${level}`;
  document.getElementById('wcag-description').textContent = wcagDescriptions[key];
}

updateDescription(); // Initialize
</script>
```

### Step 4: Use in Analysis
```typescript
// Update your analysis function
async function analyzeFrame(frame: FrameNode) {
  // Load user settings
  const settings = await loadSettings();
  const { version, level } = settings.wcag;
  
  // Get appropriate thresholds
  const thresholds = WCAG_THRESHOLDS[version][level];
  
  // Check color contrast
  if (settings.checks.colorContrast) {
    const contrastIssues = checkColorContrast(
      frame,
      thresholds.colorContrast
    );
    issues.push(...contrastIssues);
  }
  
  // Check text spacing (only for 2.1+)
  if (settings.checks.textSpacing && version !== '2.0') {
    const spacingIssues = checkTextSpacing(
      frame,
      thresholds.textSpacing
    );
    issues.push(...spacingIssues);
  }
  
  // Check non-text contrast (only for 2.1+)
  if (settings.checks.nonTextContrast && version !== '2.0') {
    const nonTextIssues = checkNonTextContrast(
      frame,
      thresholds.nonTextContrast
    );
    issues.push(...nonTextIssues);
  }
  
  return issues;
}
```

---

## Day 3-4: Settings Panel

### Step 1: Create Settings Tab
```html
<!-- In ui.html -->
<div class="tabs">
  <button class="tab-btn active" data-tab="analyze">Analyze</button>
  <button class="tab-btn" data-tab="history">History</button>
  <button class="tab-btn" data-tab="settings">Settings</button>
</div>

<div class="tab-content" id="analyze-tab">
  <!-- Existing analyze UI -->
</div>

<div class="tab-content hidden" id="history-tab">
  <!-- Existing history UI -->
</div>

<div class="tab-content hidden" id="settings-tab">
  <!-- NEW: Settings UI -->
  <div class="settings-container">
    
    <!-- WCAG Standard Section -->
    <section class="settings-card">
      <h3>📋 WCAG Standard</h3>
      <!-- From Day 1-2 above -->
    </section>
    
    <!-- Checks to Perform Section -->
    <section class="settings-card">
      <h3>🎨 Checks to Perform</h3>
      <label>
        <input type="checkbox" id="check-color-contrast" checked>
        Color Contrast
      </label>
      <label>
        <input type="checkbox" id="check-text-spacing" checked>
        Text Spacing (WCAG 2.1+)
      </label>
      <label>
        <input type="checkbox" id="check-line-height" checked>
        Line Height
      </label>
      <label>
        <input type="checkbox" id="check-paragraph-spacing" checked>
        Paragraph Spacing
      </label>
      <label>
        <input type="checkbox" id="check-non-text-contrast" checked>
        Non-text Contrast (WCAG 2.1+)
      </label>
      <label class="disabled">
        <input type="checkbox" id="check-touch-targets" disabled>
        Touch Target Size (Coming Soon)
      </label>
    </section>
    
    <!-- Display Options Section -->
    <section class="settings-card">
      <h3>🎯 Display Options</h3>
      <label>
        <input type="checkbox" id="show-overlays" checked>
        Show Visual Overlays
      </label>
      <label>
        <input type="checkbox" id="group-by-element" checked>
        Group Issues by Element
      </label>
      <label>
        <input type="checkbox" id="show-only-failures">
        Show Only Failing Checks
      </label>
      
      <div class="slider-group">
        <label>Overlay Opacity: <span id="opacity-value">70%</span></label>
        <input type="range" id="overlay-opacity" min="0" max="100" value="70">
      </div>
    </section>
    
    <!-- Cache Settings Section -->
    <section class="settings-card">
      <h3>💾 Cache Settings</h3>
      <div class="input-group">
        <label>
          Cache TTL: 
          <input type="number" id="cache-ttl" value="7" min="1" max="30"> days
        </label>
      </div>
      <div class="cache-info">
        Current Cache: <span id="cache-size">Loading...</span>
      </div>
      <button id="clear-cache-btn" class="btn-secondary">
        Clear All Cache
      </button>
    </section>
    
    <!-- Save Button -->
    <button id="save-settings-btn" class="btn-primary">
      Save Settings
    </button>
  </div>
</div>

<style>
.settings-container {
  padding: 1rem;
  max-height: 500px;
  overflow-y: auto;
}

.settings-card {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.settings-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #1a1a1a;
}

.settings-card label {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  cursor: pointer;
}

.settings-card input[type="checkbox"] {
  margin-right: 0.5rem;
}

.settings-card label.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slider-group {
  margin-top: 1rem;
}

.slider-group input[type="range"] {
  width: 100%;
  margin-top: 0.5rem;
}

.cache-info {
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 4px;
  margin: 1rem 0;
  font-size: 0.875rem;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #374151;
}
</style>

<script>
// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    // Load settings if opening settings tab
    if (tabName === 'settings') {
      loadSettingsUI();
    }
  });
});

// Load settings into UI
async function loadSettingsUI() {
  parent.postMessage({ pluginMessage: { type: 'get-settings' } }, '*');
}

// Save settings
document.getElementById('save-settings-btn').addEventListener('click', () => {
  const settings = {
    wcag: {
      version: document.getElementById('wcag-version').value,
      level: document.getElementById('wcag-level').value,
    },
    checks: {
      colorContrast: document.getElementById('check-color-contrast').checked,
      textSpacing: document.getElementById('check-text-spacing').checked,
      lineHeight: document.getElementById('check-line-height').checked,
      paragraphSpacing: document.getElementById('check-paragraph-spacing').checked,
      nonTextContrast: document.getElementById('check-non-text-contrast').checked,
    },
    display: {
      showOverlays: document.getElementById('show-overlays').checked,
      groupByElement: document.getElementById('group-by-element').checked,
      showOnlyFailures: document.getElementById('show-only-failures').checked,
      overlayOpacity: parseInt(document.getElementById('overlay-opacity').value),
    },
    cache: {
      ttlDays: parseInt(document.getElementById('cache-ttl').value),
    },
  };
  
  parent.postMessage({ 
    pluginMessage: { 
      type: 'save-settings',
      settings 
    } 
  }, '*');
  
  showNotification('Settings saved!', 'success');
});

// Opacity slider
document.getElementById('overlay-opacity').addEventListener('input', (e) => {
  document.getElementById('opacity-value').textContent = `${e.target.value}%`;
});

// Clear cache
document.getElementById('clear-cache-btn').addEventListener('click', () => {
  if (confirm('Clear all cached analyses? This cannot be undone.')) {
    parent.postMessage({ pluginMessage: { type: 'clear-all-cache' } }, '*');
    showNotification('Cache cleared!', 'success');
  }
});
</script>
```

### Step 2: Handle Settings in code.ts
```typescript
// Add message handler
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-settings') {
    const settings = await loadSettings();
    figma.ui.postMessage({ 
      type: 'settings-loaded',
      settings 
    });
  }
  
  if (msg.type === 'save-settings') {
    await saveSettings(msg.settings);
    figma.ui.postMessage({ 
      type: 'settings-saved'
    });
  }
  
  if (msg.type === 'clear-all-cache') {
    analysisCache.clear();
    // Clear Figma plugin data
    const allFrames = figma.currentPage.findAll(n => n.type === 'FRAME');
    for (const frame of allFrames) {
      await frame.setPluginData('cached-analysis', '');
    }
    figma.ui.postMessage({ type: 'cache-cleared' });
  }
};
```

---

## Day 5: UI Detection of Changes

### Step 1: Track Frame Modifications
```typescript
// Add to code.ts
let lastKnownHashes = new Map<string, string>();

// Monitor for changes
figma.on('selectionchange', async () => {
  const frame = figma.currentPage.selection[0] as FrameNode;
  if (!frame || frame.type !== 'FRAME') return;
  
  const frameId = frame.id;
  const currentHash = generateContentHash(frame);
  const lastHash = lastKnownHashes.get(frameId);
  
  if (lastHash && currentHash !== lastHash) {
    // Frame changed!
    figma.ui.postMessage({
      type: 'frame-changed',
      frameId,
      frameName: frame.name,
    });
  }
  
  lastKnownHashes.set(frameId, currentHash);
});
```

### Step 2: Show Change Indicator in UI
```html
<!-- In ui.html -->
<div id="change-alert" class="alert alert-warning hidden">
  <div class="alert-icon">⚠️</div>
  <div class="alert-content">
    <strong>Frame Modified</strong>
    <p>This frame has been changed since last analysis.</p>
  </div>
  <button id="reanalyze-btn" class="btn-primary-sm">
    Re-analyze Now
  </button>
  <button id="dismiss-alert-btn" class="btn-ghost-sm">
    Dismiss
  </button>
</div>

<style>
.alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  border-left: 4px solid;
}

.alert-warning {
  background: #fffbeb;
  border-left-color: #f59e0b;
}

.alert-icon {
  font-size: 1.5rem;
}

.alert-content {
  flex: 1;
}

.alert-content strong {
  display: block;
  margin-bottom: 0.25rem;
}

.alert-content p {
  margin: 0;
  font-size: 0.875rem;
  color: #78350f;
}

.btn-primary-sm,
.btn-ghost-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 4px;
}

.btn-primary-sm {
  background: #f59e0b;
  color: white;
  border: none;
}

.btn-ghost-sm {
  background: transparent;
  border: none;
  color: #78350f;
}

.hidden {
  display: none !important;
}
</style>

<script>
// Listen for frame changes
window.addEventListener('message', (event) => {
  const msg = event.data.pluginMessage;
  
  if (msg.type === 'frame-changed') {
    document.getElementById('change-alert').classList.remove('hidden');
  }
});

// Re-analyze button
document.getElementById('reanalyze-btn').addEventListener('click', () => {
  document.getElementById('change-alert').classList.add('hidden');
  // Trigger analysis
  parent.postMessage({ 
    pluginMessage: { type: 'analyze-frame' } 
  }, '*');
});

// Dismiss button
document.getElementById('dismiss-alert-btn').addEventListener('click', () => {
  document.getElementById('change-alert').classList.add('hidden');
});
</script>
```

---

## Testing Checklist

### WCAG Version Switching
- [ ] Switch between 2.0/2.1/2.2
- [ ] Verify different thresholds applied
- [ ] Test AA vs AAA levels
- [ ] Settings persist after plugin reload

### Settings Panel
- [ ] All checkboxes save/load correctly
- [ ] Slider updates value display
- [ ] Cache size displays correctly
- [ ] Clear cache works
- [ ] Settings survive plugin restart

### UI Detection
- [ ] Change alert shows on frame modification
- [ ] Alert dismisses correctly
- [ ] Re-analyze button works
- [ ] Hash accurately detects changes

---

## Next Steps (Week 2)

After completing Week 1:
1. Move to Stripe Integration (Week 2 Day 1-2)
2. Build Onboarding Flow (Week 2 Day 3-4)
3. Testing & bug fixes (Week 2 Day 5)

**Reference:** See MASTER_PLAN.md for full roadmap

---

## Need Help?

**Common Issues:**

**Q: Settings not saving?**
A: Check `figma.clientStorage.setAsync()` has await

**Q: Cache size not showing?**
A: Calculate with: `JSON.stringify(cache).length / 1024 / 1024` (MB)

**Q: Change detection not working?**
A: Ensure `generateContentHash()` captures text/colors/structure

---

**Good luck! 🚀**

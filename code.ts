// ============================================
// A11y Audit Pro - with WCAG Version/Level Support
// Version: 2.3.0 - Fixed AA/AAA Level Support
// ============================================

figma.showUI(__html__, { width: 400, height: 720, themeColors: true });

// ============================================
// BETA/TRIAL CONFIGURATION
// ============================================
const BETA_MODE = true;

const TRIAL_CONFIG = {
  enabled: true,
  durationDays: 30,
  globalTrialEndDate: null as string | null,
};

// ============================================
// WCAG THRESHOLDS BY VERSION AND LEVEL
// ============================================
const WCAG_THRESHOLDS: Record<string, Record<string, any>> = {
  '2.0': {
    'AA': {
      contrast: { normalText: 4.5, largeText: 3.0 },
      // WCAG 2.0 doesn't have text spacing requirements
      textSpacing: null,
      lineHeight: null,
      paragraphSpacing: null,
      nonTextContrast: null,
    },
    'AAA': {
      contrast: { normalText: 7.0, largeText: 4.5 },
      textSpacing: null,
      lineHeight: null,
      paragraphSpacing: null,
      nonTextContrast: null,
    }
  },
  '2.1': {
    'AA': {
      contrast: { normalText: 4.5, largeText: 3.0 },
      // WCAG 2.1 adds text spacing (1.4.12)
      textSpacing: { letterSpacingRatio: 0.12 },  // 0.12em
      lineHeight: { ratio: 1.5 },                  // 1.5x font size
      paragraphSpacing: { ratio: 2.0 },            // 2x font size
      nonTextContrast: { ratio: 3.0 },             // 3:1 for UI components
    },
    'AAA': {
      contrast: { normalText: 7.0, largeText: 4.5 },
      textSpacing: { letterSpacingRatio: 0.12 },
      lineHeight: { ratio: 1.5 },
      paragraphSpacing: { ratio: 2.0 },
      nonTextContrast: { ratio: 3.0 },
    }
  },
  '2.2': {
    'AA': {
      contrast: { normalText: 4.5, largeText: 3.0 },
      textSpacing: { letterSpacingRatio: 0.12 },
      lineHeight: { ratio: 1.5 },
      paragraphSpacing: { ratio: 2.0 },
      nonTextContrast: { ratio: 3.0 },
      // WCAG 2.2 adds focus appearance (2.4.11) and target size (2.5.8)
      focusAppearance: { minArea: 4, minContrast: 3.0 },
      targetSize: { minimum: 24 },  // 24x24 CSS pixels
    },
    'AAA': {
      contrast: { normalText: 7.0, largeText: 4.5 },
      textSpacing: { letterSpacingRatio: 0.12 },
      lineHeight: { ratio: 1.5 },
      paragraphSpacing: { ratio: 2.0 },
      nonTextContrast: { ratio: 4.5 },  // Stricter for AAA
      focusAppearance: { minArea: 4, minContrast: 4.5 },
      targetSize: { minimum: 44 },  // 44x44 for AAA (enhanced)
    }
  }
};

// ============================================
// STORAGE KEYS
// ============================================
const SETTINGS_KEY = 'a11y-settings';
const HISTORY_KEY = 'a11y-history';
const LICENSE_KEY = 'a11y-license';

// ============================================
// PRICING
// ============================================
const PRICING = {
  pro_monthly: { amount: 500, currency: 'INR', name: 'Pro Monthly', usd: 6 },
  pro_annual: { amount: 5000, currency: 'INR', name: 'Pro Annual', usd: 60 },
  team_monthly: { amount: 1850, currency: 'INR', name: 'Team Monthly (5 seats)', usd: 22 },
  team_annual: { amount: 18500, currency: 'INR', name: 'Team Annual (5 seats)', usd: 220 }
};

const FREE_LIMITS = {
  analysesPerMonth: 10,
  historyItems: 5
};

// ============================================
// TYPES
// ============================================
type WCAGVersion = '2.0' | '2.1' | '2.2';
type WCAGLevel = 'AA' | 'AAA';

interface WCAGSettings {
  version: WCAGVersion;
  level: WCAGLevel;
}

interface UserLicense {
  oderId: string;
  email: string;
  plan: 'free' | 'pro' | 'team' | 'trial' | 'beta';
  status: 'active' | 'expired' | 'cancelled';
  analysesThisMonth: number;
  lastAnalysisReset: number;
  trialStartDate?: number;
  trialEndDate?: number;
  subscriptionId?: string;
  currentPeriodEnd?: number;
}

interface AccessibilityIssue {
  id: string;
  elementId: string;
  elementName: string;
  elementType: string;
  type: string;
  severity: 'fail' | 'warning';
  current: string;
  required: string;
  wcagCriteria: string;  // e.g., "1.4.3" for contrast
  wcagLevel: WCAGLevel;  // Added: Track which level this issue is for
  fix?: {
    type: string;
    value?: number;
    target?: number;
    bg?: RGB;
  };
  bounds?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface HistoryItem {
  frameId: string;
  frameName: string;
  issueCount: number;
  analyzedAt: number;
  wcagVersion?: WCAGVersion;
  wcagLevel?: WCAGLevel;
}

interface AnalysisChecks {
  colorContrast: boolean;
  textSpacing: boolean;
  lineHeight: boolean;
  paragraphSpacing: boolean;
  nonTextContrast: boolean;
}

// ============================================
// STATE
// ============================================
let selectedFrame: FrameNode | null = null;
let currentIssues: AccessibilityIssue[] = [];
let overlayId: string | null = null;
let showOverlays = true;
let userLicense: UserLicense | null = null;
let currentWCAGSettings: WCAGSettings = { version: '2.1', level: 'AA' };

// ============================================
// UTILITY FUNCTIONS
// ============================================
function generateId(): string {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function calculateTrialEndDate(startDate: number): number {
  if (TRIAL_CONFIG.globalTrialEndDate) {
    return new Date(TRIAL_CONFIG.globalTrialEndDate).getTime();
  }
  return startDate + (TRIAL_CONFIG.durationDays * 24 * 60 * 60 * 1000);
}

function getTrialDaysRemaining(): number {
  if (!userLicense || !userLicense.trialEndDate) return 0;
  const remaining = userLicense.trialEndDate - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

// Validate and normalize WCAG version
function normalizeVersion(version: string): WCAGVersion {
  const v = String(version).trim();
  if (v === '2.0' || v === '2.1' || v === '2.2') {
    return v as WCAGVersion;
  }
  console.warn(`A11y Audit: Invalid version "${version}", defaulting to 2.1`);
  return '2.1';
}

// Validate and normalize WCAG level
function normalizeLevel(level: string): WCAGLevel {
  const l = String(level).trim().toUpperCase();
  if (l === 'AA' || l === 'AAA') {
    return l as WCAGLevel;
  }
  console.warn(`A11y Audit: Invalid level "${level}", defaulting to AA`);
  return 'AA';
}

function getThresholds(version: WCAGVersion, level: WCAGLevel) {
  const normalizedVersion = normalizeVersion(version);
  const normalizedLevel = normalizeLevel(level);
  
  const thresholds = WCAG_THRESHOLDS[normalizedVersion]?.[normalizedLevel];
  
  if (!thresholds) {
    console.error(`A11y Audit: No thresholds found for WCAG ${normalizedVersion} ${normalizedLevel}`);
    // Return default thresholds (2.1 AA)
    return WCAG_THRESHOLDS['2.1']['AA'];
  }
  
  return thresholds;
}

// ============================================
// LICENSE MANAGEMENT
// ============================================
async function initializeLicense(): Promise<UserLicense> {
  const stored = await figma.clientStorage.getAsync(LICENSE_KEY);
  const now = Date.now();
  
  if (stored) {
    userLicense = JSON.parse(stored) as UserLicense;
    
    if (BETA_MODE) {
      console.log('A11y Audit: BETA_MODE is ON - forcing beta plan');
      userLicense.plan = 'beta';
      userLicense.status = 'active';
      await saveLicense();
    } else {
      await updateLicensePlan();
    }
  } else {
    console.log('A11y Audit: Creating new license');
    userLicense = {
      oderId: generateId(),
      email: '',
      plan: BETA_MODE ? 'beta' : (TRIAL_CONFIG.enabled ? 'trial' : 'free'),
      status: 'active',
      analysesThisMonth: 0,
      lastAnalysisReset: now,
      trialStartDate: now,
      trialEndDate: calculateTrialEndDate(now)
    };
    await saveLicense();
  }
  
  console.log('A11y Audit: License initialized:', userLicense.plan);
  return userLicense;
}

async function saveLicense(): Promise<void> {
  if (userLicense) {
    await figma.clientStorage.setAsync(LICENSE_KEY, JSON.stringify(userLicense));
  }
}

async function updateLicensePlan(): Promise<void> {
  if (!userLicense || BETA_MODE) return;
  
  const now = Date.now();
  
  if (userLicense.plan === 'trial' && userLicense.trialEndDate) {
    if (now >= userLicense.trialEndDate) {
      console.log('A11y Audit: Trial expired, converting to free');
      userLicense.plan = 'free';
      userLicense.analysesThisMonth = 0;
      userLicense.lastAnalysisReset = now;
      await saveLicense();
    }
  }
  
  if (userLicense.plan === 'free') {
    const daysSinceReset = (now - userLicense.lastAnalysisReset) / (1000 * 60 * 60 * 24);
    if (daysSinceReset >= 30) {
      userLicense.analysesThisMonth = 0;
      userLicense.lastAnalysisReset = now;
      await saveLicense();
    }
  }
}

function canAnalyze(): { allowed: boolean; reason?: string } {
  if (!userLicense) {
    return { allowed: false, reason: 'License not initialized' };
  }
  
  if (BETA_MODE || userLicense.plan === 'beta' || userLicense.plan === 'trial') {
    return { allowed: true };
  }
  
  if (userLicense.plan === 'pro' || userLicense.plan === 'team') {
    return { allowed: true };
  }
  
  if (userLicense.plan === 'free') {
    if (userLicense.analysesThisMonth >= FREE_LIMITS.analysesPerMonth) {
      return { 
        allowed: false, 
        reason: `Free limit reached (${FREE_LIMITS.analysesPerMonth}/month). Upgrade to Pro for unlimited analyses.`
      };
    }
  }
  
  if (userLicense.status !== 'active') {
    return { allowed: false, reason: 'Subscription expired. Please renew.' };
  }
  
  return { allowed: true };
}

async function recordAnalysis(): Promise<void> {
  if (!userLicense) return;
  
  if (userLicense.plan === 'free') {
    userLicense.analysesThisMonth++;
    await saveLicense();
    
    figma.ui.postMessage({
      type: 'usage-updated',
      usage: {
        used: userLicense.analysesThisMonth,
        limit: FREE_LIMITS.analysesPerMonth
      }
    });
  }
}

async function upgradeLicense(plan: 'pro' | 'team', subscriptionId: string, email: string): Promise<void> {
  if (!userLicense) await initializeLicense();
  
  userLicense!.plan = plan;
  userLicense!.status = 'active';
  userLicense!.subscriptionId = subscriptionId;
  userLicense!.email = email;
  userLicense!.currentPeriodEnd = Date.now() + (30 * 24 * 60 * 60 * 1000);
  
  await saveLicense();
  
  figma.ui.postMessage({ 
    type: 'license-updated', 
    license: userLicense 
  });
  
  figma.notify(`🎉 Upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan!`);
}

// ============================================
// SETTINGS MANAGEMENT
// ============================================
async function loadSettings(): Promise<WCAGSettings> {
  const data = figma.root.getPluginData(SETTINGS_KEY);
  if (data) {
    try {
      const settings = JSON.parse(data);
      // Validate and normalize loaded settings
      currentWCAGSettings = {
        version: normalizeVersion(settings.version),
        level: normalizeLevel(settings.level)
      };
      console.log(`A11y Audit: Loaded settings - WCAG ${currentWCAGSettings.version} ${currentWCAGSettings.level}`);
      return currentWCAGSettings;
    } catch (e) {
      console.error('A11y Audit: Failed to parse settings:', e);
      return currentWCAGSettings;
    }
  }
  console.log('A11y Audit: No saved settings, using defaults');
  return currentWCAGSettings;
}

async function saveSettings(settings: WCAGSettings): Promise<void> {
  // Validate and normalize before saving
  currentWCAGSettings = {
    version: normalizeVersion(settings.version),
    level: normalizeLevel(settings.level)
  };
  figma.root.setPluginData(SETTINGS_KEY, JSON.stringify(currentWCAGSettings));
  console.log(`A11y Audit: Saved settings - WCAG ${currentWCAGSettings.version} ${currentWCAGSettings.level}`);
}

// ============================================
// HISTORY MANAGEMENT
// ============================================
async function loadHistory(): Promise<HistoryItem[]> {
  const data = figma.root.getPluginData(HISTORY_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

async function saveToHistory(frame: FrameNode, issueCount: number): Promise<void> {
  const history = await loadHistory();
  const maxItems = (userLicense?.plan === 'free') ? FREE_LIMITS.historyItems : 50;
  
  const filtered = history.filter(h => h.frameId !== frame.id);
  
  filtered.unshift({
    frameId: frame.id,
    frameName: frame.name,
    issueCount,
    analyzedAt: Date.now(),
    wcagVersion: currentWCAGSettings.version,
    wcagLevel: currentWCAGSettings.level
  });
  
  const limited = filtered.slice(0, maxItems);
  figma.root.setPluginData(HISTORY_KEY, JSON.stringify(limited));
}

// ============================================
// OVERLAY MANAGEMENT
// ============================================
async function createOverlays(issues: AccessibilityIssue[], frame: FrameNode): Promise<void> {
  await removeOverlays();
  
  if (!showOverlays || issues.length === 0) return;
  
  const overlayGroup = figma.createFrame();
  overlayGroup.name = '🔍 A11y Audit Overlays (Auto-Delete)';
  overlayGroup.fills = [];
  overlayGroup.clipsContent = false;
  overlayGroup.locked = true;
  
  overlayGroup.x = frame.absoluteTransform[0][2];
  overlayGroup.y = frame.absoluteTransform[1][2];
  overlayGroup.resize(frame.width, frame.height);
  
  for (const issue of issues) {
    if (issue.bounds) {
      const rect = figma.createRectangle();
      rect.name = `Issue: ${issue.elementName}`;
      
      const color = issue.severity === 'fail' 
        ? { r: 0.9, g: 0.2, b: 0.2 } 
        : { r: 0.9, g: 0.6, b: 0.1 };
      
      rect.fills = [{ type: 'SOLID', color, opacity: 0.15 }];
      rect.strokes = [{ type: 'SOLID', color }];
      rect.strokeWeight = 2;
      rect.dashPattern = [4, 4];
      
      rect.x = issue.bounds.x - frame.absoluteTransform[0][2];
      rect.y = issue.bounds.y - frame.absoluteTransform[1][2];
      rect.resize(Math.max(issue.bounds.w, 10), Math.max(issue.bounds.h, 10));
      
      overlayGroup.appendChild(rect);
    }
  }
  
  figma.currentPage.appendChild(overlayGroup);
  overlayId = overlayGroup.id;
}

async function removeOverlays(): Promise<void> {
  if (overlayId) {
    const node = await figma.getNodeByIdAsync(overlayId);
    if (node) node.remove();
    overlayId = null;
  }
  
  const overlays = figma.currentPage.findAll(n => n.name.includes('A11y Audit Overlays'));
  overlays.forEach(o => o.remove());
}

// ============================================
// ACCESSIBILITY ANALYSIS
// ============================================
function getElementType(node: SceneNode): string {
  const name = node.name.toLowerCase();
  
  if (name.includes('button') || name.includes('btn')) return 'Button';
  if (name.includes('label')) return 'Label';
  if (name.includes('input') || name.includes('field')) return 'Input';
  if (name.includes('heading') || name.includes('title') || name.match(/^h[1-6]/)) return 'Heading';
  if (name.includes('link')) return 'Link';
  if (name.includes('nav')) return 'Navigation';
  if (name.includes('icon')) return 'Icon';
  if (name.includes('image') || name.includes('img')) return 'Image';
  
  if (node.type === 'TEXT') return 'Text Layer';
  if (node.type === 'FRAME') return 'Frame';
  if (node.type === 'RECTANGLE') return 'Rectangle';
  if (node.type === 'ELLIPSE') return 'Ellipse';
  
  return node.type;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function getBackgroundColor(node: SceneNode): Promise<RGB> {
  let current: SceneNode | null = node;
  
  while (current) {
    if ('fills' in current && Array.isArray(current.fills)) {
      for (const fill of current.fills) {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          return fill.color;
        }
      }
    }
    current = current.parent as SceneNode | null;
  }
  
  return { r: 1, g: 1, b: 1 };
}

async function analyzeFrame(
  frame: FrameNode, 
  checks: AnalysisChecks,
  wcagSettings: WCAGSettings
): Promise<AccessibilityIssue[]> {
  // Normalize and validate settings
  const version = normalizeVersion(wcagSettings.version);
  const level = normalizeLevel(wcagSettings.level);
  const thresholds = getThresholds(version, level);
  
  console.log('========================================');
  console.log(`A11y Audit: ANALYSIS START`);
  console.log(`A11y Audit: WCAG Version: ${version}`);
  console.log(`A11y Audit: WCAG Level: ${level}`);
  console.log(`A11y Audit: Contrast Thresholds - Normal: ${thresholds.contrast.normalText}:1, Large: ${thresholds.contrast.largeText}:1`);
  if (thresholds.textSpacing) {
    console.log(`A11y Audit: Text Spacing: ${thresholds.textSpacing.letterSpacingRatio}em`);
  } else {
    console.log(`A11y Audit: Text Spacing: NOT CHECKED (WCAG ${version} doesn't require it)`);
  }
  console.log('========================================');
  
  const issues: AccessibilityIssue[] = [];
  const textNodes = frame.findAll(n => n.type === 'TEXT') as TextNode[];
  
  console.log(`A11y Audit: Found ${textNodes.length} text nodes to analyze`);
  
  for (const text of textNodes) {
    const elementType = getElementType(text);
    const bounds = {
      x: text.absoluteTransform[0][2],
      y: text.absoluteTransform[1][2],
      w: text.width,
      h: text.height
    };
    
    // ========================================
    // COLOR CONTRAST CHECK (WCAG 1.4.3 / 1.4.6)
    // AA uses 1.4.3, AAA uses 1.4.6
    // AA: 4.5:1 normal, 3.0:1 large
    // AAA: 7.0:1 normal, 4.5:1 large
    // ========================================
    if (checks.colorContrast && thresholds.contrast) {
      const textFills = text.fills as Paint[];
      if (textFills && textFills.length > 0) {
        const textFill = textFills.find(f => f.type === 'SOLID' && f.visible !== false) as SolidPaint;
        if (textFill) {
          const textColor = textFill.color;
          const bgColor = await getBackgroundColor(text);
          
          const textLum = getLuminance(textColor.r, textColor.g, textColor.b);
          const bgLum = getLuminance(bgColor.r, bgColor.g, bgColor.b);
          const ratio = getContrastRatio(textLum, bgLum);
          
          const fontSize = typeof text.fontSize === 'number' ? text.fontSize : 12;
          const fontWeight = text.fontWeight as number || 400;
          
          // Large text: 18pt (24px) or 14pt (18.66px) bold
          const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
          const required = isLargeText ? thresholds.contrast.largeText : thresholds.contrast.normalText;
          
          // WCAG criteria reference
          // 1.4.3 = Contrast (Minimum) - Level AA
          // 1.4.6 = Contrast (Enhanced) - Level AAA
          const wcagCriteria = level === 'AAA' ? '1.4.6' : '1.4.3';
          
          console.log(`A11y Audit: Checking "${text.name}" - Contrast: ${ratio.toFixed(2)}:1, Required (${level}): ${required}:1, Large text: ${isLargeText}`);
          
          if (ratio < required) {
            console.log(`A11y Audit: ❌ FAIL - Contrast too low for ${level}`);
            issues.push({
              id: generateId(),
              elementId: text.id,
              elementName: text.name || 'Unnamed Text',
              elementType,
              type: 'Color Contrast',
              severity: ratio < 3.0 ? 'fail' : 'warning',
              current: ratio.toFixed(2) + ':1',
              required: required + ':1 (' + level + ')',
              wcagCriteria,
              wcagLevel: level,
              bounds,
              fix: { type: 'contrast', bg: bgColor }
            });
          } else {
            console.log(`A11y Audit: ✅ PASS - Contrast meets ${level} requirements`);
          }
        }
      }
    }
    
    // ========================================
    // TEXT SPACING CHECK (WCAG 1.4.12)
    // Only in WCAG 2.1 and 2.2 (both AA and AAA)
    // ========================================
    if (checks.textSpacing && thresholds.textSpacing) {
      const fontSize = typeof text.fontSize === 'number' ? text.fontSize : 12;
      const letterSpacing = typeof text.letterSpacing === 'object' 
        ? (text.letterSpacing as { value: number; unit: string }).value 
        : 0;
      
      const requiredSpacing = fontSize * thresholds.textSpacing.letterSpacingRatio;
      
      if (letterSpacing < requiredSpacing) {
        issues.push({
          id: generateId(),
          elementId: text.id,
          elementName: text.name || 'Unnamed Text',
          elementType,
          type: 'Text Spacing',
          severity: 'warning',
          current: letterSpacing.toFixed(1) + 'px',
          required: requiredSpacing.toFixed(1) + 'px (0.12em)',
          wcagCriteria: '1.4.12',
          wcagLevel: level,
          bounds,
          fix: { type: 'letterSpacing', value: letterSpacing, target: requiredSpacing }
        });
      }
    }
    
    // ========================================
    // LINE HEIGHT CHECK (WCAG 1.4.12)
    // Only in WCAG 2.1 and 2.2 (both AA and AAA)
    // ========================================
    if (checks.lineHeight && thresholds.lineHeight) {
      const fontSize = typeof text.fontSize === 'number' ? text.fontSize : 12;
      let lineHeightValue = fontSize * 1.2;
      
      if (text.lineHeight && typeof text.lineHeight === 'object') {
        const lh = text.lineHeight as { value: number; unit: string };
        if (lh.unit === 'PIXELS') {
          lineHeightValue = lh.value;
        } else if (lh.unit === 'PERCENT') {
          lineHeightValue = (lh.value / 100) * fontSize;
        }
      }
      
      const requiredLineHeight = fontSize * thresholds.lineHeight.ratio;
      
      if (lineHeightValue < requiredLineHeight) {
        issues.push({
          id: generateId(),
          elementId: text.id,
          elementName: text.name || 'Unnamed Text',
          elementType,
          type: 'Line Height',
          severity: 'warning',
          current: (lineHeightValue / fontSize).toFixed(2) + 'x',
          required: thresholds.lineHeight.ratio + 'x',
          wcagCriteria: '1.4.12',
          wcagLevel: level,
          bounds,
          fix: { type: 'lineHeight', value: lineHeightValue, target: requiredLineHeight }
        });
      }
    }
    
    // ========================================
    // PARAGRAPH SPACING CHECK (WCAG 1.4.12)
    // Only in WCAG 2.1 and 2.2 (both AA and AAA)
    // ========================================
    if (checks.paragraphSpacing && thresholds.paragraphSpacing) {
      const fontSize = typeof text.fontSize === 'number' ? text.fontSize : 12;
      const paragraphSpacing = text.paragraphSpacing || 0;
      const requiredParagraphSpacing = fontSize * thresholds.paragraphSpacing.ratio;
      
      if (text.characters.includes('\n') && paragraphSpacing < requiredParagraphSpacing) {
        issues.push({
          id: generateId(),
          elementId: text.id,
          elementName: text.name || 'Unnamed Text',
          elementType,
          type: 'Paragraph Spacing',
          severity: 'warning',
          current: paragraphSpacing.toFixed(0) + 'px',
          required: requiredParagraphSpacing.toFixed(0) + 'px (2em)',
          wcagCriteria: '1.4.12',
          wcagLevel: level,
          bounds,
          fix: { type: 'paragraphSpacing', value: paragraphSpacing, target: requiredParagraphSpacing }
        });
      }
    }
  }
  
  console.log('========================================');
  console.log(`A11y Audit: ANALYSIS COMPLETE`);
  console.log(`A11y Audit: Total issues found: ${issues.length}`);
  console.log('========================================');
  
  return issues;
}

async function applyFix(issue: AccessibilityIssue): Promise<boolean> {
  try {
    const node = await figma.getNodeByIdAsync(issue.elementId);
    if (!node || node.type !== 'TEXT') return false;
    
    const textNode = node as TextNode;
    await figma.loadFontAsync(textNode.fontName as FontName);
    
    switch (issue.fix?.type) {
      case 'letterSpacing':
        textNode.letterSpacing = { value: issue.fix.target!, unit: 'PIXELS' };
        break;
      case 'lineHeight':
        textNode.lineHeight = { value: issue.fix.target!, unit: 'PIXELS' };
        break;
      case 'paragraphSpacing':
        textNode.paragraphSpacing = issue.fix.target!;
        break;
      default:
        return false;
    }
    
    return true;
  } catch (error) {
    console.error('A11y Audit: Fix failed:', error);
    return false;
  }
}

// ============================================
// FRAME SELECTION
// ============================================
function handleSelectionChange(): void {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 1 && selection[0].type === 'FRAME') {
    selectedFrame = selection[0] as FrameNode;
    figma.ui.postMessage({
      type: 'frame-selected',
      name: selectedFrame.name,
      id: selectedFrame.id
    });
  } else {
    selectedFrame = null;
    figma.ui.postMessage({ type: 'no-frame' });
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================
figma.ui.onmessage = async (msg: any) => {
  switch (msg.type) {
    case 'analyze':
      if (!selectedFrame) {
        figma.notify('Please select a frame first');
        return;
      }
      
      const analysisCheck = canAnalyze();
      if (!analysisCheck.allowed) {
        figma.ui.postMessage({ type: 'upgrade-required', reason: analysisCheck.reason });
        figma.notify(analysisCheck.reason || 'Unable to analyze');
        return;
      }
      
      figma.ui.postMessage({ type: 'started' });
      showOverlays = msg.showOverlay !== false;
      
      // Get WCAG settings from message and validate them
      let wcagSettings: WCAGSettings;
      if (msg.wcagSettings) {
        wcagSettings = {
          version: normalizeVersion(msg.wcagSettings.version),
          level: normalizeLevel(msg.wcagSettings.level)
        };
      } else {
        wcagSettings = currentWCAGSettings;
      }
      
      currentWCAGSettings = wcagSettings;
      await saveSettings(wcagSettings);
      
      console.log(`A11y Audit: Received analyze request`);
      console.log(`A11y Audit: Using WCAG ${wcagSettings.version} ${wcagSettings.level}`);
      
      try {
        const issues = await analyzeFrame(
          selectedFrame, 
          msg.checks || {
            colorContrast: true,
            textSpacing: true,
            lineHeight: true,
            paragraphSpacing: true,
            nonTextContrast: false
          },
          wcagSettings
        );
        
        currentIssues = issues;
        
        await createOverlays(issues, selectedFrame);
        await saveToHistory(selectedFrame, issues.length);
        await recordAnalysis();
        
        figma.ui.postMessage({
          type: 'results',
          issues: issues,
          frameId: selectedFrame.id,
          frameName: selectedFrame.name,
          wcagVersion: wcagSettings.version,
          wcagLevel: wcagSettings.level
        });
        
        if (issues.length === 0) {
          figma.notify(`✅ No WCAG ${wcagSettings.version} ${wcagSettings.level} issues found!`);
        } else {
          figma.notify(`Found ${issues.length} WCAG ${wcagSettings.version} ${wcagSettings.level} issues`);
        }
      } catch (error) {
        console.error('A11y Audit: Analysis error:', error);
        figma.notify('Error during analysis');
        figma.ui.postMessage({ type: 'results', issues: [] });
      }
      break;
      
    case 'apply-fix':
      if (msg.index >= 0 && msg.index < currentIssues.length) {
        const issue = currentIssues[msg.index];
        const success = await applyFix(issue);
        
        if (success) {
          figma.notify('✅ Fix applied!');
          figma.ui.postMessage({ type: 'fixed', index: msg.index });
        } else {
          figma.notify('Could not apply fix');
        }
      }
      break;
      
    case 'toggle-overlay':
      showOverlays = msg.show;
      if (showOverlays && selectedFrame && currentIssues.length > 0) {
        await createOverlays(currentIssues, selectedFrame);
      } else {
        await removeOverlays();
      }
      break;
      
    case 'jump':
      const jumpNode = await figma.getNodeByIdAsync(msg.id);
      if (jumpNode) {
        figma.currentPage.selection = [jumpNode as SceneNode];
        figma.viewport.scrollAndZoomIntoView([jumpNode as SceneNode]);
      }
      break;
      
    case 'get-history':
      const history = await loadHistory();
      figma.ui.postMessage({ type: 'history', data: history });
      break;
      
    case 'clear-history':
      figma.root.setPluginData(HISTORY_KEY, '[]');
      figma.ui.postMessage({ type: 'history', data: [] });
      figma.notify('History cleared');
      break;
      
    case 'save-settings':
      if (msg.wcagSettings) {
        const settingsToSave: WCAGSettings = {
          version: normalizeVersion(msg.wcagSettings.version),
          level: normalizeLevel(msg.wcagSettings.level)
        };
        await saveSettings(settingsToSave);
        figma.notify(`Settings saved: WCAG ${settingsToSave.version} ${settingsToSave.level}`);
        
        // Send back the normalized settings
        figma.ui.postMessage({ 
          type: 'settings-saved', 
          wcagSettings: settingsToSave 
        });
      }
      break;
      
    case 'get-settings':
      const settings = await loadSettings();
      figma.ui.postMessage({ type: 'settings-loaded', settings });
      break;
      
    case 'payment-success':
      await upgradeLicense(msg.plan, msg.subscriptionId, msg.email);
      break;
  }
};

// ============================================
// INITIALIZATION
// ============================================
async function init(): Promise<void> {
  console.log('A11y Audit: Initializing plugin...');
  console.log('A11y Audit: BETA_MODE =', BETA_MODE);
  
  await initializeLicense();
  const settings = await loadSettings();
  
  figma.ui.postMessage({
    type: 'init',
    license: userLicense,
    betaMode: BETA_MODE,
    trialDaysRemaining: getTrialDaysRemaining(),
    wcagSettings: settings
  });
  
  handleSelectionChange();
  figma.on('selectionchange', handleSelectionChange);
  
  console.log('A11y Audit: Plugin ready!');
  console.log(`A11y Audit: Current WCAG settings: ${settings.version} ${settings.level}`);
}

figma.on('close', async () => {
  await removeOverlays();
});

init();

// code.ts - A11y Audit Pro - v2.0 with Razorpay Integration
figma.showUI(__html__, { width: 400, height: 720, themeColors: true });

// ============================================
// TYPES & CONSTANTS
// ============================================

const SETTINGS_KEY = 'a11y-settings';
const HISTORY_KEY = 'a11y-history';
const LICENSE_KEY = 'a11y-license';
const USER_KEY = 'a11y-user';

// Pricing Configuration
const PRICING = {
  pro_monthly: { amount: 500, currency: 'INR', name: 'Pro Monthly', usd: 6 },
  pro_annual: { amount: 5000, currency: 'INR', name: 'Pro Annual', usd: 60 },
  team_monthly: { amount: 1850, currency: 'INR', name: 'Team Monthly (5 seats)', usd: 22 },
  team_annual: { amount: 18500, currency: 'INR', name: 'Team Annual (5 seats)', usd: 220 }
};

// Free tier limits
const FREE_LIMITS = {
  analysesPerMonth: 10,
  historyItems: 5
};

interface Issue {
  id: string;
  elementId: string;
  elementName: string;
  elementType: string;  // NEW: Shows element type (Text Layer, Button, etc.)
  type: string;
  severity: 'fail' | 'warning';
  current: string;
  required: string;
  fix?: any;
  bounds?: { x: number; y: number; w: number; h: number };
}

interface UserLicense {
  oderId: string;
  email: string;
  plan: 'free' | 'pro' | 'team';
  status: 'active' | 'expired' | 'cancelled';
  subscriptionId?: string;
  teamId?: string;
  teamRole?: 'admin' | 'member';
  currentPeriodEnd?: number;
  analysesThisMonth: number;
  lastAnalysisReset: number;
}

interface TeamData {
  teamId: string;
  teamName: string;
  adminEmail: string;
  seats: number;
  members: { email: string; oderId: string; role: 'admin' | 'member'; joinedAt: number }[];
}

// ============================================
// STATE
// ============================================

let selectedFrame: FrameNode | null = null;
let currentIssues: Issue[] = [];
let overlayId: string | null = null;
let showOverlays = true;
let userLicense: UserLicense | null = null;

// ============================================
// LICENSE MANAGEMENT
// ============================================

async function initializeLicense(): Promise<UserLicense> {
  const stored = await figma.clientStorage.getAsync(LICENSE_KEY);
  
  if (stored) {
    userLicense = JSON.parse(stored);
    
    // Check if we need to reset monthly counter
    const now = Date.now();
    const lastReset = userLicense!.lastAnalysisReset || 0;
    const daysSinceReset = (now - lastReset) / (1000 * 60 * 60 * 24);
    
    if (daysSinceReset >= 30) {
      userLicense!.analysesThisMonth = 0;
      userLicense!.lastAnalysisReset = now;
      await saveLicense();
    }
    
    return userLicense!;
  }
  
  // Create new free user
  userLicense = {
    oderId: generateUserId(),
    email: '',
    plan: 'free',
    status: 'active',
    analysesThisMonth: 0,
    lastAnalysisReset: Date.now()
  };
  
  await saveLicense();
  return userLicense;
}

async function saveLicense(): Promise<void> {
  if (userLicense) {
    await figma.clientStorage.setAsync(LICENSE_KEY, JSON.stringify(userLicense));
  }
}

async function upgradeLicense(plan: 'pro' | 'team', subscriptionId: string, email: string): Promise<void> {
  if (!userLicense) await initializeLicense();
  
  userLicense!.plan = plan;
  userLicense!.status = 'active';
  userLicense!.subscriptionId = subscriptionId;
  userLicense!.email = email;
  userLicense!.currentPeriodEnd = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
  
  await saveLicense();
  
  figma.ui.postMessage({ 
    type: 'license-updated', 
    license: userLicense 
  });
  
  figma.notify(`🎉 Upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan!`);
}

function canAnalyze(): { allowed: boolean; reason?: string } {
  if (!userLicense) {
    return { allowed: false, reason: 'License not initialized' };
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
  
  userLicense.analysesThisMonth++;
  await saveLicense();
  
  figma.ui.postMessage({
    type: 'usage-updated',
    usage: {
      used: userLicense.analysesThisMonth,
      limit: userLicense.plan === 'free' ? FREE_LIMITS.analysesPerMonth : 'unlimited'
    }
  });
}

function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// ============================================
// INIT
// ============================================

(async () => {
  // Initialize license
  await initializeLicense();
  
  // Send license info to UI
  figma.ui.postMessage({ 
    type: 'init', 
    license: userLicense,
    pricing: PRICING,
    freeLimits: FREE_LIMITS
  });
  
  // Check for selected frame
  setTimeout(() => {
    const sel = figma.currentPage.selection;
    if (sel.length === 1 && sel[0].type === 'FRAME') {
      selectedFrame = sel[0] as FrameNode;
      figma.ui.postMessage({ type: 'frame-selected', name: selectedFrame.name });
    }
  }, 50);
})();

// ============================================
// SELECTION
// ============================================

figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection;
  
  if (sel.length !== 1 || sel[0].type !== 'FRAME') {
    selectedFrame = null;
    figma.ui.postMessage({ type: 'no-frame' });
    return;
  }
  
  selectedFrame = sel[0] as FrameNode;
  figma.ui.postMessage({ type: 'frame-selected', name: selectedFrame.name });
});

// ============================================
// MESSAGE HANDLER
// ============================================

figma.ui.onmessage = async (msg) => {
  
  // ========== ANALYSIS ==========
  if (msg.type === 'analyze') {
    if (!selectedFrame) {
      figma.notify('Select a frame first');
      return;
    }
    
    // Check if user can analyze
    const canDo = canAnalyze();
    if (!canDo.allowed) {
      figma.notify(canDo.reason || 'Cannot analyze');
      figma.ui.postMessage({ type: 'upgrade-required', reason: canDo.reason });
      return;
    }
    
    const checks = msg.checks || {
      colorContrast: true,
      textSpacing: true,
      lineHeight: true,
      paragraphSpacing: true,
      nonTextContrast: true
    };
    
    showOverlays = msg.showOverlay !== false;
    
    currentIssues = [];
    await removeOverlay();  // FIXED: Await async function
    
    figma.ui.postMessage({ type: 'started' });
    
    // Collect text nodes (max 300)
    const textNodes: TextNode[] = [];
    let count = 0;
    
    function collect(node: SceneNode) {
      if (count > 300) return;
      if (node.type === 'TEXT') {
        textNodes.push(node);
        count++;
      }
      if ('children' in node) {
        for (const c of node.children) {
          if (count > 300) break;
          collect(c);
        }
      }
    }
    collect(selectedFrame);
    
    // Analyze
    for (const node of textNodes) {
      if (checks.colorContrast) analyzeContrast(node);
      if (checks.textSpacing) analyzeSpacing(node);
      if (checks.lineHeight) analyzeLineHeight(node);
      if (checks.paragraphSpacing) analyzeParagraphSpacing(node);
    }
    
    // Limit to 50 issues
    if (currentIssues.length > 50) {
      currentIssues = currentIssues.slice(0, 50);
    }
    
    // Record this analysis for usage tracking
    await recordAnalysis();
    
    // Save to history
    await saveToHistory(selectedFrame.name, currentIssues.length);
    
    figma.ui.postMessage({ type: 'results', issues: currentIssues, count: currentIssues.length });
    
    if (showOverlays && currentIssues.length > 0) {
      await createOverlay();  // FIXED: Await async function
    }
    
    figma.notify(`Found ${currentIssues.length} issues`);
  }
  
  // ========== OVERLAY TOGGLE ==========
  if (msg.type === 'toggle-overlay') {
    showOverlays = msg.show === true;
    
    if (!showOverlays) {
      await removeOverlay();  // FIXED: Await async function
    } else if (currentIssues.length > 0 && selectedFrame) {
      await createOverlay();  // FIXED: Await async function
    }
  }
  
  // ========== APPLY FIX ==========
  if (msg.type === 'apply-fix') {
    const issue = currentIssues[msg.index];
    if (issue && issue.fix) {
      await applyFix(issue);
    }
  }
  
  // ========== JUMP TO ELEMENT ==========
  if (msg.type === 'jump') {
    try {
      const node = await figma.getNodeByIdAsync(msg.id);  // FIXED: Use async version
      if (node) {
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
        figma.notify('✅ Jumped to element');
      } else {
        figma.notify('❌ Element not found');
      }
    } catch (error) {
      figma.notify('❌ Unable to jump to element');
      console.error('Jump error:', error);
    }
  }
  
  // ========== SETTINGS ==========
  if (msg.type === 'get-settings') {
    const data = figma.root.getPluginData(SETTINGS_KEY);
    figma.ui.postMessage({ type: 'settings', data: data ? JSON.parse(data) : null });
  }
  
  if (msg.type === 'save-settings') {
    figma.root.setPluginData(SETTINGS_KEY, JSON.stringify(msg.settings));
    figma.notify('Settings saved');
  }
  
  // ========== HISTORY ==========
  if (msg.type === 'get-history') {
    const data = figma.root.getPluginData(HISTORY_KEY);
    figma.ui.postMessage({ type: 'history', data: data ? JSON.parse(data) : [] });
  }
  
  if (msg.type === 'clear-history') {
    figma.root.setPluginData(HISTORY_KEY, '');
    figma.notify('History cleared');
  }
  
  // ========== LICENSE / PAYMENT ==========
  if (msg.type === 'get-license') {
    figma.ui.postMessage({ type: 'license', data: userLicense });
  }
  
  if (msg.type === 'payment-success') {
    // Called when Razorpay payment completes successfully
    await upgradeLicense(msg.plan, msg.subscriptionId, msg.email);
  }
  
  if (msg.type === 'update-email') {
    if (userLicense) {
      userLicense.email = msg.email;
      await saveLicense();
    }
  }
  
  // ========== OPEN EXTERNAL URL ==========
  if (msg.type === 'open-url') {
    // Figma plugins can't directly open URLs, but we can notify the user
    figma.notify('Opening payment page...');
  }
};

// ============================================
// HISTORY MANAGEMENT
// ============================================

async function saveToHistory(frameName: string, issueCount: number): Promise<void> {
  const historyData = figma.root.getPluginData(HISTORY_KEY);
  let history = historyData ? JSON.parse(historyData) : [];
  
  // Add new entry
  history.unshift({
    frameId: selectedFrame?.id || '',
    frameName: frameName,
    issueCount: issueCount,
    analyzedAt: Date.now()
  });
  
  // Limit history based on plan
  const limit = userLicense?.plan === 'free' ? FREE_LIMITS.historyItems : 50;
  if (history.length > limit) {
    history = history.slice(0, limit);
  }
  
  figma.root.setPluginData(HISTORY_KEY, JSON.stringify(history));
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

function analyzeContrast(node: TextNode) {
  try {
    if (node.fontName === figma.mixed) return;
    const fontSize = node.fontSize as number;
    if (typeof fontSize !== 'number') return;
    
    const textColor = getColor(node.fills);
    if (!textColor) return;
    
    const bgColor = findBgColor(node);
    const ratio = contrastRatio(textColor, bgColor);
    
    const isLarge = fontSize >= 18;
    const required = isLarge ? 3.0 : 4.5;
    
    if (ratio < required) {
      const b = node.absoluteBoundingBox;
      currentIssues.push({
        id: `${node.id}-contrast`,
        elementId: node.id,
        elementName: node.name || 'Text',
        elementType: getElementType(node),  // FIXED: Add element type
        type: 'Color Contrast',
        severity: 'fail',
        current: `${ratio.toFixed(1)}:1`,
        required: `${required}:1`,
        fix: { type: 'color', target: required, bg: bgColor },
        bounds: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : undefined
      });
    }
  } catch {}
}

function analyzeSpacing(node: TextNode) {
  try {
    const fontSize = node.fontSize as number;
    if (typeof fontSize !== 'number') return;
    
    const ls = node.letterSpacing as LetterSpacing;
    let current = 0;
    if (ls?.unit === 'PIXELS') current = ls.value;
    else if (ls?.unit === 'PERCENT') current = (ls.value / 100) * fontSize;
    
    const required = fontSize * 0.12;
    
    if (current < required * 0.9) {
      const b = node.absoluteBoundingBox;
      currentIssues.push({
        id: `${node.id}-spacing`,
        elementId: node.id,
        elementName: node.name || 'Text',
        elementType: getElementType(node),  // FIXED: Add element type
        type: 'Text Spacing',
        severity: 'fail',
        current: `${current.toFixed(1)}px`,
        required: `${required.toFixed(1)}px`,
        fix: { type: 'letterSpacing', value: required },
        bounds: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : undefined
      });
    }
  } catch {}
}

function analyzeLineHeight(node: TextNode) {
  try {
    const fontSize = node.fontSize as number;
    if (typeof fontSize !== 'number') return;
    
    const lh = node.lineHeight as LineHeight;
    let current = fontSize * 1.2;
    if (lh?.unit === 'PIXELS') current = lh.value;
    else if (lh?.unit === 'PERCENT') current = (lh.value / 100) * fontSize;
    
    const required = fontSize * 1.5;
    
    if (current < required * 0.9) {
      const b = node.absoluteBoundingBox;
      currentIssues.push({
        id: `${node.id}-lineheight`,
        elementId: node.id,
        elementName: node.name || 'Text',
        elementType: getElementType(node),  // FIXED: Add element type
        type: 'Line Height',
        severity: 'fail',
        current: `${current.toFixed(1)}px`,
        required: `${required.toFixed(1)}px`,
        fix: { type: 'lineHeight', value: required },
        bounds: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : undefined
      });
    }
  } catch {}
}

function analyzeParagraphSpacing(node: TextNode) {
  try {
    const fontSize = node.fontSize as number;
    if (typeof fontSize !== 'number') return;
    
    const current = node.paragraphSpacing || 0;
    const required = fontSize * 2;
    
    if (current < required * 0.8) {
      const b = node.absoluteBoundingBox;
      currentIssues.push({
        id: `${node.id}-paragraph`,
        elementId: node.id,
        elementName: node.name || 'Text',
        elementType: getElementType(node),  // FIXED: Add element type
        type: 'Paragraph Spacing',
        severity: 'fail',
        current: `${current.toFixed(1)}px`,
        required: `${required.toFixed(1)}px`,
        fix: { type: 'paragraphSpacing', value: required },
        bounds: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : undefined
      });
    }
  } catch {}
}

// ============================================
// OVERLAY
// ============================================

async function createOverlay() {
  if (!selectedFrame) return;
  
  const fb = selectedFrame.absoluteBoundingBox;
  if (!fb) return;
  
  await removeOverlay();  // FIXED: Await async function
  
  const frame = figma.createFrame();
  frame.name = 'A11Y-Overlay';
  frame.x = fb.x;
  frame.y = fb.y;
  frame.resize(fb.width, fb.height);
  frame.fills = [];
  frame.locked = true;
  
  overlayId = frame.id;
  
  if (selectedFrame.parent && 'insertChild' in selectedFrame.parent) {
    const idx = selectedFrame.parent.children.indexOf(selectedFrame);
    selectedFrame.parent.insertChild(idx + 1, frame);
  }
  
  for (const issue of currentIssues) {
    if (!issue.bounds) continue;
    
    const rect = figma.createRectangle();
    rect.x = issue.bounds.x - fb.x;
    rect.y = issue.bounds.y - fb.y;
    rect.resize(Math.max(issue.bounds.w, 2), Math.max(issue.bounds.h, 2));
    rect.fills = [];
    rect.strokes = [{
      type: 'SOLID',
      color: issue.severity === 'fail' 
        ? { r: 1, g: 0.2, b: 0.2 }
        : { r: 1, g: 0.8, b: 0 }
    }];
    rect.strokeWeight = 2;
    rect.dashPattern = [4, 4];
    
    frame.appendChild(rect);
  }
}

async function removeOverlay() {
  if (overlayId) {
    try {
      const node = await figma.getNodeByIdAsync(overlayId);  // FIXED: Use async version
      if (node) node.remove();
    } catch (error) {
      console.log('Overlay already removed or not found');
    }
    overlayId = null;
  }
}

// ============================================
// HELPERS
// ============================================

// Detect element type for better issue descriptions
function getElementType(node: SceneNode): string {
  if (node.type === 'TEXT') {
    // Check if it's part of a component
    if (node.parent && node.parent.type === 'COMPONENT') {
      return 'Text Layer (Component)';
    }
    
    // Check if it's in an instance
    if (node.parent && node.parent.type === 'INSTANCE') {
      return 'Text Layer (Instance)';
    }
    
    // Check common naming patterns
    const name = node.name.toLowerCase();
    if (name.includes('button') || name.includes('btn') || name.includes('cta')) {
      return 'Text Layer (Button)';
    }
    
    if (name.includes('label') || name.includes('title') || name.includes('heading')) {
      return 'Text Layer (Label)';
    }
    
    if (name.includes('input') || name.includes('field') || name.includes('placeholder')) {
      return 'Text Layer (Input)';
    }
    
    return 'Text Layer';
  }
  
  return node.type;
}

function getColor(fills: readonly Paint[] | typeof figma.mixed): RGB | null {
  if (Array.isArray(fills) && fills[0]?.type === 'SOLID') {
    return fills[0].color;
  }
  return null;
}

function findBgColor(node: SceneNode): RGB {
  let parent = node.parent;
  for (let i = 0; i < 8; i++) {
    if (!parent) break;
    if ('fills' in parent) {
      const c = getColor(parent.fills as readonly Paint[]);
      if (c) return c;
    }
    parent = parent.parent;
  }
  return { r: 1, g: 1, b: 1 };
}

function luminance(c: RGB): number {
  const r = c.r <= 0.03928 ? c.r / 12.92 : Math.pow((c.r + 0.055) / 1.055, 2.4);
  const g = c.g <= 0.03928 ? c.g / 12.92 : Math.pow((c.g + 0.055) / 1.055, 2.4);
  const b = c.b <= 0.03928 ? c.b / 12.92 : Math.pow((c.b + 0.055) / 1.055, 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(c1: RGB, c2: RGB): number {
  const l1 = luminance(c1);
  const l2 = luminance(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

async function applyFix(issue: Issue) {
  try {
    const node = await figma.getNodeByIdAsync(issue.elementId);  // FIXED: Use async version
    if (!node || node.type !== 'TEXT') {
      figma.notify('❌ Element not found');
      return;
    }
    
    const fontName = node.fontName;
    if (fontName !== figma.mixed) {
      await figma.loadFontAsync(fontName as FontName);
    }
    
    if (issue.fix.type === 'letterSpacing') {
      node.letterSpacing = { value: issue.fix.value, unit: 'PIXELS' };
    } else if (issue.fix.type === 'lineHeight') {
      node.lineHeight = { value: issue.fix.value, unit: 'PIXELS' };
    } else if (issue.fix.type === 'paragraphSpacing') {
      node.paragraphSpacing = issue.fix.value;
    }
    
    figma.notify('✅ Fix applied!');
    figma.ui.postMessage({ type: 'fixed', index: currentIssues.indexOf(issue) });
  } catch (error) {
    figma.notify('❌ Could not apply fix');
    console.error('Fix error:', error);
  }
}
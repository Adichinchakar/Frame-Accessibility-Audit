// code.ts - A11y Audit Pro - Optimized v3
figma.showUI(__html__, { width: 380, height: 750, themeColors: true });

// ============================================
// CONSTANTS & TYPES
// ============================================

const PLUGIN_VERSION = '1.0.0';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const PLUGIN_DATA_KEY = 'a11y-analysis';
const HISTORY_KEY = 'a11y-history';
const SETTINGS_KEY = 'settings';

interface CachedAnalysis {
  timestamp: number;
  version: string;
  contentHash: string;
  results: AccessibilityIssue[];
}

interface AccessibilityIssue {
  elementId: string;
  elementName: string;
  issueType: string;
  severity: 'fail' | 'warning';
  wcagLevel: 'AA' | 'AAA';
  currentValue: string;
  requiredValue: string;
  suggestion: string;
  suggestedFix: any;
  bounds?: { x: number; y: number; width: number; height: number };
}

interface UserSettings {
  wcag: { version: '2.0' | '2.1' | '2.2'; level: 'AA' | 'AAA' };
  checks: {
    colorContrast: boolean;
    textSpacing: boolean;
    lineHeight: boolean;
    paragraphSpacing: boolean;
    nonTextContrast: boolean;
  };
  display: {
    showOverlays: boolean;
    groupByElement: boolean;
    showOnlyFailures: boolean;
    overlayOpacity: number;
  };
  cache: { ttlDays: number };
}

interface AnalysisHistoryItem {
  id: string;
  frameId: string;
  frameName: string;
  analyzedAt: number;
  issueCount: number;
  failCount: number;
  warnCount: number;
  issues: AccessibilityIssue[];
}

// ============================================
// STATE
// ============================================

const analysisCache = new Map<string, CachedAnalysis>();
let analysisHistory: AnalysisHistoryItem[] = [];
let selectedFrame: FrameNode | null = null;
let currentIssues: AccessibilityIssue[] = [];
let overlayFrame: FrameNode | null = null;

// ============================================
// CACHE FUNCTIONS
// ============================================

function getCachedAnalysis(frame: FrameNode): CachedAnalysis | null {
  let cached = analysisCache.get(frame.id);

  if (!cached) {
    const pluginData = frame.getPluginData(PLUGIN_DATA_KEY);
    if (pluginData) {
      try {
        cached = JSON.parse(pluginData);
        if (cached) analysisCache.set(frame.id, cached);
      } catch { return null; }
    }
  }

  if (!cached) return null;
  
  if (isCacheValid(frame, cached)) return cached;
  
  clearFrameCache(frame);
  return null;
}

function setCachedAnalysis(frame: FrameNode, results: AccessibilityIssue[]): void {
  const cached: CachedAnalysis = {
    timestamp: Date.now(),
    version: PLUGIN_VERSION,
    contentHash: generateContentHash(frame),
    results
  };
  analysisCache.set(frame.id, cached);
  try { frame.setPluginData(PLUGIN_DATA_KEY, JSON.stringify(cached)); } catch {}
}

function isCacheValid(frame: FrameNode, cached: CachedAnalysis): boolean {
  if (Date.now() - cached.timestamp > CACHE_DURATION) return false;
  if (cached.version !== PLUGIN_VERSION) return false;
  return generateContentHash(frame) === cached.contentHash;
}

function clearFrameCache(frame: FrameNode): void {
  analysisCache.delete(frame.id);
  frame.setPluginData(PLUGIN_DATA_KEY, '');
}

function clearAllCaches(): void {
  analysisCache.clear();
  const allFrames = figma.currentPage.findAll(n => n.type === 'FRAME') as FrameNode[];
  allFrames.forEach(f => { if (f.getPluginData(PLUGIN_DATA_KEY)) f.setPluginData(PLUGIN_DATA_KEY, ''); });
  figma.notify('✓ All saved data cleared');
}

function generateContentHash(frame: FrameNode): string {
  const texts: string[] = [];
  const colors: string[] = [];
  
  function walk(n: SceneNode) {
    if (n.type === 'TEXT') {
      texts.push(n.characters);
      const fills = n.fills;
      if (Array.isArray(fills)) {
        fills.forEach(f => { if (f.type === 'SOLID') colors.push(`${f.color.r},${f.color.g},${f.color.b}`); });
      }
    }
    if ('children' in n) n.children.forEach(walk);
  }
  walk(frame);
  
  let hash = 0;
  const str = JSON.stringify({ c: frame.children.length, t: texts, co: colors });
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getCacheAge(timestamp: number): string {
  const ms = Date.now() - timestamp;
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

// ============================================
// HISTORY FUNCTIONS
// ============================================

function loadHistoryData(): AnalysisHistoryItem[] {
  try {
    const data = figma.root.getPluginData(HISTORY_KEY);
    if (data) { analysisHistory = JSON.parse(data); return analysisHistory; }
  } catch {}
  return [];
}

function saveToHistory(frame: FrameNode, issues: AccessibilityIssue[]): void {
  if (!frame?.id || !frame?.name) return;
  
  const item: AnalysisHistoryItem = {
    id: `${frame.id}-${Date.now()}`,
    frameId: frame.id,
    frameName: frame.name,
    analyzedAt: Date.now(),
    issueCount: issues.length,
    failCount: issues.filter(i => i.severity === 'fail').length,
    warnCount: issues.filter(i => i.severity === 'warning').length,
    issues
  };

  loadHistoryData();
  analysisHistory.unshift(item);
  if (analysisHistory.length > 50) analysisHistory = analysisHistory.slice(0, 50);
  try { figma.root.setPluginData(HISTORY_KEY, JSON.stringify(analysisHistory)); } catch {}
}

function clearHistory(): void {
  analysisHistory = [];
  figma.root.setPluginData(HISTORY_KEY, '');
  figma.notify('✓ History cleared');
}

// ============================================
// SETTINGS
// ============================================

function loadSettings(): UserSettings {
  try {
    const stored = figma.root.getPluginData(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return getDefaultSettings();
}

function saveSettings(settings: UserSettings): void {
  try { figma.root.setPluginData(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

function getDefaultSettings(): UserSettings {
  return {
    wcag: { version: '2.1', level: 'AA' },
    checks: { colorContrast: true, textSpacing: true, lineHeight: true, paragraphSpacing: true, nonTextContrast: true },
    display: { showOverlays: true, groupByElement: true, showOnlyFailures: false, overlayOpacity: 70 },
    cache: { ttlDays: 7 }
  };
}

// ============================================
// SELECTION HANDLER
// ============================================

figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'frame-deselected' });
    selectedFrame = null;
  } else if (selection.length > 1) {
    figma.ui.postMessage({ type: 'selection-error', message: 'Please select only one frame' });
    selectedFrame = null;
  } else if (selection[0].type === 'FRAME') {
    selectedFrame = selection[0] as FrameNode;
    const cached = getCachedAnalysis(selectedFrame);
    
    figma.ui.postMessage({ 
      type: 'frame-selected', 
      frameName: selectedFrame.name,
      frameId: selectedFrame.id,
      hasCache: !!cached
    });
    
    if (cached) {
      currentIssues = cached.results;
      figma.ui.postMessage({
        type: 'analysis-complete',
        issues: groupIssuesByElement(cached.results),
        totalIssues: cached.results.length,
        fromCache: true,
        cacheAge: getCacheAge(cached.timestamp)
      });
    }
  } else {
    figma.ui.postMessage({ type: 'selection-error', message: 'Please select a frame' });
    selectedFrame = null;
  }
});

// Initial check
setTimeout(() => {
  const selection = figma.currentPage.selection;
  if (selection.length === 1 && selection[0].type === 'FRAME') {
    selectedFrame = selection[0] as FrameNode;
    const cached = getCachedAnalysis(selectedFrame);
    figma.ui.postMessage({ 
      type: 'frame-selected', 
      frameName: selectedFrame.name,
      frameId: selectedFrame.id,
      hasCache: !!cached
    });
  }
}, 100);

// ============================================
// MESSAGE HANDLER
// ============================================

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'get-settings':
      figma.ui.postMessage({ type: 'settings-loaded', settings: loadSettings() });
      break;
    
    case 'save-settings':
      saveSettings(msg.settings);
      figma.ui.postMessage({ type: 'settings-saved' });
      figma.notify('✓ Settings saved');
      break;
    
    case 'analyze':
    case 'analyze-frame':
      if (!selectedFrame) {
        figma.ui.postMessage({ type: 'analysis-error', message: 'Please select a frame first' });
        return;
      }
      
      try {
        const checks = msg.checks || loadSettings().checks;
        const showOverlay = msg.showOverlay !== false;
        
        currentIssues = [];
        clearOverlays();
        
        figma.ui.postMessage({ type: 'analysis-started' });
        
        // OPTIMIZED: Collect all nodes first, then process
        const textNodes: TextNode[] = [];
        const shapeNodes: SceneNode[] = [];
        
        function collectNodes(node: SceneNode) {
          if (node.type === 'TEXT') textNodes.push(node);
          else if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'VECTOR') shapeNodes.push(node);
          if ('children' in node) node.children.forEach(collectNodes);
        }
        collectNodes(selectedFrame);
        
        const total = textNodes.length + (checks.nonTextContrast ? shapeNodes.length : 0);
        let processed = 0;
        
        // Process text nodes
        for (const node of textNodes) {
          if (checks.colorContrast) checkTextContrast(node);
          if (checks.textSpacing) checkTextSpacing(node);
          if (checks.lineHeight) checkLineHeight(node);
          if (checks.paragraphSpacing) checkParagraphSpacing(node);
          
          processed++;
          if (processed % 20 === 0 || processed === total) {
            figma.ui.postMessage({
              type: 'analysis-progress',
              progress: Math.round((processed / total) * 100),
              current: processed,
              total
            });
          }
        }
        
        // Process shapes
        if (checks.nonTextContrast) {
          for (const node of shapeNodes) {
            checkNonTextContrast(node);
            processed++;
            if (processed % 20 === 0 || processed === total) {
              figma.ui.postMessage({
                type: 'analysis-progress',
                progress: Math.round((processed / total) * 100),
                current: processed,
                total
              });
            }
          }
        }
        
        setCachedAnalysis(selectedFrame, currentIssues);
        saveToHistory(selectedFrame, currentIssues);
        
        figma.ui.postMessage({
          type: 'analysis-complete',
          issues: groupIssuesByElement(currentIssues),
          totalIssues: currentIssues.length,
          fromCache: false
        });
        
        if (currentIssues.length > 0 && showOverlay) {
          await createOverlayFrame(selectedFrame, currentIssues);
        }
        
        figma.notify(`✓ ${currentIssues.length} issues found`);
      } catch (error) {
        figma.ui.postMessage({ type: 'analysis-error', message: 'Analysis failed' });
      }
      break;
    
    case 'get-history':
      figma.ui.postMessage({ type: 'history-loaded', analyses: loadHistoryData() });
      break;
    
    case 'clear-history':
      clearHistory();
      figma.ui.postMessage({ type: 'history-cleared' });
      break;
    
    case 'clear-all-cache':
      clearAllCaches();
      figma.ui.postMessage({ type: 'cache-cleared' });
      break;
    
    case 'clear-cache':
      if (selectedFrame) {
        clearFrameCache(selectedFrame);
        figma.ui.postMessage({ type: 'cache-cleared' });
        figma.notify('✓ Frame data cleared');
      }
      break;
    
    case 'apply-fix':
      if (msg.issueIndex !== undefined && currentIssues[msg.issueIndex]) {
        await applyFix(msg.issueIndex, currentIssues[msg.issueIndex].suggestedFix);
      }
      break;
    
    case 'toggle-overlay':
      if (msg.show === false) {
        clearOverlays();
      } else if (msg.show === true && selectedFrame && currentIssues.length > 0) {
        await createOverlayFrame(selectedFrame, currentIssues);
      }
      break;
    
    case 'clear-overlays':
      clearOverlays();
      break;
    
    case 'jump-to-element':
      const node = figma.getNodeById(msg.elementId);
      if (node) {
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
      break;
    
    case 'select-frame':
      const frameNode = figma.getNodeById(msg.frameId);
      if (frameNode?.type === 'FRAME') {
        figma.currentPage.selection = [frameNode];
        figma.viewport.scrollAndZoomIntoView([frameNode]);
      }
      break;
  }
};

// ============================================
// ANALYSIS FUNCTIONS (OPTIMIZED - NO FONT LOADING)
// ============================================

function checkTextContrast(textNode: TextNode): void {
  try {
    const fontName = textNode.fontName;
    if (fontName === figma.mixed) return;
    
    const fontSize = textNode.fontSize as number;
    if (typeof fontSize !== 'number') return;
    
    const bgColor = getBackgroundColor(textNode);
    const textColor = getTextColor(textNode);
    if (!bgColor || !textColor) return;

    const ratio = getContrastRatio(textColor, bgColor);
    
    let fontWeight = 400;
    if (fontName && typeof fontName === 'object' && 'style' in fontName) {
      const style = fontName.style.toLowerCase();
      if (style.includes('black') || style.includes('heavy')) fontWeight = 900;
      else if (style.includes('bold')) fontWeight = 700;
      else if (style.includes('semibold')) fontWeight = 600;
      else if (style.includes('medium')) fontWeight = 500;
    }
    
    const isLarge = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
    const aaReq = isLarge ? 3.0 : 4.5;
    const aaaReq = isLarge ? 4.5 : 7.0;
    const bounds = textNode.absoluteBoundingBox;

    if (ratio < aaReq) {
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Color Contrast',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${ratio.toFixed(2)}:1`,
        requiredValue: `${aaReq}:1`,
        suggestion: `Increase contrast to ${aaReq}:1`,
        suggestedFix: { type: 'textColor', value: calculateBetterColor(textColor, bgColor, aaReq) },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    } else if (ratio < aaaReq) {
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Color Contrast',
        severity: 'warning',
        wcagLevel: 'AAA',
        currentValue: `${ratio.toFixed(2)}:1`,
        requiredValue: `${aaaReq}:1`,
        suggestion: `Increase contrast to ${aaaReq}:1 for AAA`,
        suggestedFix: { type: 'textColor', value: calculateBetterColor(textColor, bgColor, aaaReq) },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch {}
}

function checkTextSpacing(textNode: TextNode): void {
  try {
    const fontSize = textNode.fontSize as number;
    if (typeof fontSize !== 'number') return;
    
    const letterSpacing = textNode.letterSpacing as LetterSpacing;
    let current = 0;
    if (letterSpacing.unit === 'PIXELS') current = letterSpacing.value;
    else if (letterSpacing.unit === 'PERCENT') current = (letterSpacing.value / 100) * fontSize;

    const required = fontSize * 0.12;
    if (current < required) {
      const bounds = textNode.absoluteBoundingBox;
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Text Spacing',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${current.toFixed(1)}px`,
        requiredValue: `${required.toFixed(1)}px`,
        suggestion: `Increase letter spacing`,
        suggestedFix: { type: 'letterSpacing', value: required },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch {}
}

function checkLineHeight(textNode: TextNode): void {
  try {
    const fontSize = textNode.fontSize as number;
    if (typeof fontSize !== 'number') return;
    
    const lineHeight = textNode.lineHeight as LineHeight;
    let current = fontSize * 1.5;
    if (lineHeight.unit === 'PIXELS') current = lineHeight.value;
    else if (lineHeight.unit === 'PERCENT') current = (lineHeight.value / 100) * fontSize;

    const required = fontSize * 1.5;
    if (current < required) {
      const bounds = textNode.absoluteBoundingBox;
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Line Height',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${current.toFixed(1)}px`,
        requiredValue: `${required.toFixed(1)}px`,
        suggestion: `Increase line height to 1.5x`,
        suggestedFix: { type: 'lineHeight', value: required },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch {}
}

function checkParagraphSpacing(textNode: TextNode): void {
  try {
    const fontSize = textNode.fontSize as number;
    if (typeof fontSize !== 'number') return;
    
    const spacing = textNode.paragraphSpacing;
    const required = fontSize * 2.0;
    
    if (spacing < required) {
      const bounds = textNode.absoluteBoundingBox;
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Paragraph Spacing',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${spacing.toFixed(1)}px`,
        requiredValue: `${required.toFixed(1)}px`,
        suggestion: `Increase paragraph spacing to 2x`,
        suggestedFix: { type: 'paragraphSpacing', value: required },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch {}
}

function checkNonTextContrast(node: SceneNode): void {
  try {
    const fills = 'fills' in node ? node.fills : [];
    if (!Array.isArray(fills) || fills.length === 0) return;
    
    const fill = fills[0];
    if (fill.type !== 'SOLID') return;
    
    const bgColor = getBackgroundColor(node);
    if (!bgColor) return;
    
    const ratio = getContrastRatio(fill.color, bgColor);
    if (ratio < 3.0) {
      const bounds = 'absoluteBoundingBox' in node ? node.absoluteBoundingBox : null;
      currentIssues.push({
        elementId: node.id,
        elementName: node.name,
        issueType: 'Non-text Contrast',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${ratio.toFixed(2)}:1`,
        requiredValue: `3.0:1`,
        suggestion: `Increase contrast`,
        suggestedFix: { type: 'fillColor', value: fill.color },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch {}
}

// ============================================
// OVERLAY FUNCTIONS
// ============================================

async function createOverlayFrame(targetFrame: FrameNode, issues: AccessibilityIssue[]): Promise<void> {
  const frameBounds = targetFrame.absoluteBoundingBox;
  if (!frameBounds) return;

  clearOverlays();

  overlayFrame = figma.createFrame();
  overlayFrame.name = '🔍 A11Y Overlay';
  overlayFrame.resize(frameBounds.width, frameBounds.height);
  overlayFrame.x = frameBounds.x;
  overlayFrame.y = frameBounds.y;
  overlayFrame.fills = [];
  overlayFrame.locked = true;

  if (targetFrame.parent && 'insertChild' in targetFrame.parent) {
    const idx = targetFrame.parent.children.indexOf(targetFrame);
    targetFrame.parent.insertChild(idx + 1, overlayFrame);
  }

  // Load font once for all labels
  try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); } catch {}

  for (const issue of issues) {
    if (!issue.bounds || !overlayFrame) continue;
    
    try {
      const box = figma.createRectangle();
      box.name = `Issue: ${issue.issueType}`;
      box.x = issue.bounds.x - frameBounds.x;
      box.y = issue.bounds.y - frameBounds.y;
      box.resize(issue.bounds.width, issue.bounds.height);

      const color = issue.severity === 'fail' ? { r: 0.95, g: 0.26, b: 0.21 } : { r: 1, g: 0.76, b: 0.03 };
      box.fills = [];
      box.strokes = [{ type: 'SOLID', color }];
      box.strokeWeight = 1;
      box.dashPattern = [8, 4];
      box.opacity = 0.9;
      overlayFrame.appendChild(box);

      try {
        const label = figma.createText();
        label.characters = issue.severity === 'fail' ? '✕' : '⚠';
        label.fontSize = 14;
        label.fills = [{ type: 'SOLID', color }];
        label.x = box.x - 10;
        label.y = box.y - 18;
        overlayFrame.appendChild(label);
      } catch {}
    } catch {}
  }
}

function clearOverlays(): void {
  try {
    if (overlayFrame) { overlayFrame.remove(); overlayFrame = null; }
    figma.currentPage.findAll(n => n.name === '🔍 A11Y Overlay').forEach(n => { try { n.remove(); } catch {} });
  } catch {}
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTextColor(node: TextNode): RGB | null {
  const fills = node.fills;
  if (Array.isArray(fills) && fills.length > 0 && fills[0].type === 'SOLID') return fills[0].color;
  return null;
}

function getBackgroundColor(node: SceneNode): RGB | null {
  let parent = node.parent;
  while (parent) {
    if ('fills' in parent) {
      const fills = parent.fills;
      if (Array.isArray(fills) && fills.length > 0 && fills[0].type === 'SOLID') return fills[0].color;
    }
    parent = parent.parent;
  }
  return { r: 1, g: 1, b: 1 };
}

function getContrastRatio(c1: RGB, c2: RGB): number {
  const l1 = getLuminance(c1);
  const l2 = getLuminance(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function getLuminance(c: RGB): number {
  const r = c.r <= 0.03928 ? c.r / 12.92 : Math.pow((c.r + 0.055) / 1.055, 2.4);
  const g = c.g <= 0.03928 ? c.g / 12.92 : Math.pow((c.g + 0.055) / 1.055, 2.4);
  const b = c.b <= 0.03928 ? c.b / 12.92 : Math.pow((c.b + 0.055) / 1.055, 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateBetterColor(textColor: RGB, bgColor: RGB, target: number): RGB {
  const bgLum = getLuminance(bgColor);
  const step = getLuminance(textColor) > bgLum ? 0.05 : -0.05;
  let c = { ...textColor };
  
  for (let i = 0; i < 20; i++) {
    c.r = Math.max(0, Math.min(1, c.r + step));
    c.g = Math.max(0, Math.min(1, c.g + step));
    c.b = Math.max(0, Math.min(1, c.b + step));
    if (getContrastRatio(c, bgColor) >= target) return c;
  }
  return c;
}

function groupIssuesByElement(issues: AccessibilityIssue[]): any[] {
  const grouped: { [key: string]: any[] } = {};
  issues.forEach((issue, idx) => {
    const key = `${issue.elementName}_${issue.elementId}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ ...issue, index: idx });
  });
  return Object.entries(grouped).map(([_, issues]) => ({
    elementName: issues[0].elementName,
    elementId: issues[0].elementId,
    issues
  }));
}

async function applyFix(issueIndex: number, fix: any): Promise<void> {
  const issue = currentIssues[issueIndex];
  const node = figma.getNodeById(issue.elementId);
  if (!node) { figma.ui.postMessage({ type: 'error', message: 'Element not found' }); return; }

  try {
    if (node.type === 'TEXT') {
      await figma.loadFontAsync(node.fontName as FontName);
      
      if (fix.type === 'textColor') node.fills = [{ type: 'SOLID', color: fix.value }];
      else if (fix.type === 'letterSpacing') node.letterSpacing = { value: fix.value, unit: 'PIXELS' };
      else if (fix.type === 'lineHeight') node.lineHeight = { value: fix.value, unit: 'PIXELS' };
      else if (fix.type === 'paragraphSpacing') node.paragraphSpacing = fix.value;
    }

    figma.ui.postMessage({ type: 'fix-applied', message: 'Fix applied!' });
    figma.notify('✓ Fix applied!');
    if (selectedFrame) clearFrameCache(selectedFrame);
  } catch {
    figma.ui.postMessage({ type: 'error', message: 'Failed to apply fix' });
  }
}

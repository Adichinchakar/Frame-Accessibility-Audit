// code.ts - Simplified Accessibility Plugin with Working History
figma.showUI(__html__, { width: 380, height: 750, themeColors: true });

const PLUGIN_VERSION = '1.0.0';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const PLUGIN_DATA_KEY = 'a11y-analysis';

const analysisCache = new Map<string, CachedAnalysis>();

const DEFAULT_SETTINGS: UserSettings = {
  wcag: { version: '2.1', level: 'AA' },
  checks: {
    colorContrast: true,
    textSpacing: true,
    lineHeight: true,
    paragraphSpacing: true,
    nonTextContrast: true
  },
  display: {
    showOverlays: true,
    groupByElement: true,
    showOnlyFailures: false,
    overlayOpacity: 70
  },
  cache: {
    ttlDays: 7
  }
};

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
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface UserSettings {
  wcag: {
    version: '2.0' | '2.1' | '2.2';
    level: 'AA' | 'AAA';
  };
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
  cache: {
    ttlDays: number;
  };
}

let selectedFrame: FrameNode | null = null;
let currentIssues: AccessibilityIssue[] = [];
let overlayFrame: FrameNode | null = null;
let isPaused = false;
let analysisProgress = 0;
let totalElements = 0;

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
        if (cached) {
          analysisCache.set(frame.id, cached);
        }
      } catch (error) {
        console.error('Failed to parse cached data:', error);
        return null;
      }
    }
  }

  if (!cached) return null;

  if (isCacheValid(frame, cached)) {
    console.log('✓ Using valid cache for:', frame.name);
    return cached;
  }

  console.log('✗ Cache invalid for:', frame.name);
  clearFrameCache(frame);
  return null;
}

function setCachedAnalysis(frame: FrameNode, results: AccessibilityIssue[]): void {
  const cached: CachedAnalysis = {
    timestamp: Date.now(),
    version: PLUGIN_VERSION,
    contentHash: generateContentHash(frame),
    results: results
  };

  analysisCache.set(frame.id, cached);

  try {
    frame.setPluginData(PLUGIN_DATA_KEY, JSON.stringify(cached));
    console.log('✓ Cached analysis for:', frame.name, 'ID:', frame.id);
  } catch (error) {
    console.error('Failed to save cache:', error);
  }
}

function isCacheValid(frame: FrameNode, cached: CachedAnalysis): boolean {
  if (isExpired(cached.timestamp)) {
    return false;
  }

  if (cached.version !== PLUGIN_VERSION) {
    return false;
  }

  const currentHash = generateContentHash(frame);
  if (currentHash !== cached.contentHash) {
    return false;
  }

  return true;
}

function isExpired(timestamp: number): boolean {
  return (Date.now() - timestamp) > CACHE_DURATION;
}

function clearFrameCache(frame: FrameNode): void {
  analysisCache.delete(frame.id);
  frame.setPluginData(PLUGIN_DATA_KEY, '');
}

function clearAllCaches(): void {
  analysisCache.clear();

  const allFrames = figma.currentPage.findAll(node => node.type === 'FRAME') as FrameNode[];
  allFrames.forEach(frame => {
    if (frame.getPluginData(PLUGIN_DATA_KEY)) {
      frame.setPluginData(PLUGIN_DATA_KEY, '');
    }
  });

  figma.notify('✓ All caches cleared');
}

function generateContentHash(frame: FrameNode): string {
  const fingerprint = {
    childCount: frame.children.length,
    texts: collectTextContent(frame),
    colors: collectColors(frame),
  };

  return simpleHash(JSON.stringify(fingerprint));
}

function collectTextContent(node: SceneNode): string[] {
  const texts: string[] = [];

  function walk(n: SceneNode) {
    if (n.type === 'TEXT') {
      texts.push(n.characters);
    }
    if ('children' in n) {
      n.children.forEach(child => walk(child));
    }
  }

  walk(node);
  return texts;
}

function collectColors(node: SceneNode): string[] {
  const colors: string[] = [];

  function walk(n: SceneNode) {
    if (n.type === 'TEXT') {
      const fills = n.fills;
      if (Array.isArray(fills)) {
        fills.forEach(fill => {
          if (fill.type === 'SOLID') {
            colors.push(`${fill.color.r},${fill.color.g},${fill.color.b}`);
          }
        });
      }
    }
    if ('children' in n) {
      n.children.forEach(child => walk(child));
    }
  }

  walk(node);
  return colors;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getCacheAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);

  if (ageDays > 0) return `${ageDays}d ago`;
  if (ageHours > 0) return `${ageHours}h ago`;
  if (ageMinutes > 0) return `${ageMinutes}m ago`;
  return 'just now';
}

// ============================================
// SELECTION HANDLER - FIXED TO AUTO-LOAD
// ============================================

figma.on('selectionchange', async () => {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'selection-error', message: 'No frame selected' });
    selectedFrame = null;
  } else if (selection.length > 1) {
    figma.ui.postMessage({ type: 'selection-error', message: 'Multiple frames selected. Please select only one frame.' });
    selectedFrame = null;
  } else if (selection[0].type === 'FRAME') {
    selectedFrame = selection[0] as FrameNode;
    
    // Check for cached analysis
    const cached = getCachedAnalysis(selectedFrame);
    
    if (cached) {
      // Has valid cache - auto-load results!
      console.log('✓ Auto-loading cached results for:', selectedFrame.name);
      
      const groupedIssues = groupIssuesByElement(cached.results);
      
      // Send frame selected
      figma.ui.postMessage({ 
        type: 'frame-selected', 
        frameName: selectedFrame.name,
        layerCount: countElements(selectedFrame)
      });
      
      // Send cache info
      figma.ui.postMessage({
        type: 'cache-available',
        age: getCacheAge(cached.timestamp),
        hasChanges: false
      });
      
      // AUTO-LOAD RESULTS (This is the fix!)
      figma.ui.postMessage({
        type: 'analysis-complete',
        issues: groupedIssues,
        totalIssues: cached.results.length,
        fromCache: true,
        cacheAge: getCacheAge(cached.timestamp)
      });
      
    } else {
      // No cache - just show frame selected
      figma.ui.postMessage({ 
        type: 'frame-selected', 
        frameName: selectedFrame.name,
        layerCount: countElements(selectedFrame)
      });
    }
  } else {
    figma.ui.postMessage({ type: 'no-frame-selected', message: 'Please select a frame (not a single element)' });
    selectedFrame = null;
  }
});

// ============================================
// MESSAGE HANDLER
// ============================================

figma.ui.onmessage = async (msg) => {
  console.log('Received message:', msg.type);

  switch (msg.type) {
    case 'get-settings':
      const settings = await loadSettings();
      figma.ui.postMessage({ 
        type: 'settings-loaded',
        settings 
      });
      break;
    
    case 'save-settings':
      await saveSettings(msg.settings);
      figma.ui.postMessage({ 
        type: 'settings-saved'
      });
      break;
    
    case 'analyze-frame':
      if (!selectedFrame) {
        figma.ui.postMessage({ type: 'error', message: 'Please select a frame first' });
        return;
      }
      try {
        const checks = msg.checks || (await loadSettings()).checks;
        currentIssues = [];
        clearOverlays();
        totalElements = countElements(selectedFrame);
        
        await analyzeFrame(selectedFrame, checks);
        setCachedAnalysis(selectedFrame, currentIssues);
        
        const groupedIssues = groupIssuesByElement(currentIssues);
        figma.ui.postMessage({
          type: 'analysis-complete',
          issues: groupedIssues,
          totalIssues: currentIssues.length,
          fromCache: false
        });
        
        if (currentIssues.length > 0 && msg.showOverlay) {
          await createOverlayFrame(selectedFrame, currentIssues);
        }
      } catch (error) {
        console.error('Analysis error:', error);
        figma.ui.postMessage({ type: 'error', message: 'Analysis failed: ' + error });
      }
      break;
    
    case 'get-all-analyses':
      // TODO: Implement with backend if needed
      figma.ui.postMessage({
        type: 'all-analyses',
        analyses: []
      });
      break;
    
    case 'clear-all-cache':
      clearAllCaches();
      figma.ui.postMessage({ type: 'cache-cleared' });
      break;
    
    case 'apply-fix':
      if (msg.issueIndex !== undefined && currentIssues[msg.issueIndex]) {
        const issue = currentIssues[msg.issueIndex];
        await applyFix(msg.issueIndex, issue.suggestedFix);
      }
      break;
    
    case 'pause-analysis':
      isPaused = true;
      figma.ui.postMessage({ type: 'analysis-paused' });
      break;
    
    case 'resume-analysis':
      isPaused = false;
      figma.ui.postMessage({ type: 'analysis-resumed' });
      break;
    
    case 'toggle-overlay':
      if (overlayFrame) {
        overlayFrame.visible = msg.visible;
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
    
    case 'clear-cache':
      if (selectedFrame) {
        clearFrameCache(selectedFrame);
        figma.ui.postMessage({ type: 'cache-cleared' });
      }
      break;
  }
};

// ============================================
// SELECTION CHANGE EVENT
// ============================================

figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 1 && selection[0].type === 'FRAME') {
    selectedFrame = selection[0] as FrameNode;
    const hasCache = !!getCachedAnalysis(selectedFrame);
    
    figma.ui.postMessage({
      type: 'frame-selected',
      frameName: selectedFrame.name,
      frameId: selectedFrame.id,
      layerCount: countElements(selectedFrame),
      hasCache
    });
  } else {
    selectedFrame = null;
    figma.ui.postMessage({
      type: 'frame-deselected'
    });
  }
});

// Broadcast initial selection on load (100ms delay to ensure UI ready)
setTimeout(() => {
  const selection = figma.currentPage.selection;
  if (selection.length === 1 && selection[0].type === 'FRAME') {
    selectedFrame = selection[0] as FrameNode;
    const hasCache = !!getCachedAnalysis(selectedFrame);
    
    figma.ui.postMessage({
      type: 'frame-selected',
      frameName: selectedFrame.name,
      frameId: selectedFrame.id,
      layerCount: countElements(selectedFrame),
      hasCache
    });
  }
}, 100);

// ============================================
// SETTINGS MANAGEMENT
// ============================================

interface Settings {
  wcag: { version: '2.0' | '2.1' | '2.2'; level: 'AA' | 'AAA' };
  checks: Record<string, boolean>;
  display: { showOverlays: boolean; groupByElement: boolean; showOnlyFailures: boolean; overlayOpacity: number };
  cache: { ttlDays: number };
}

function loadSettings(): Settings {
  const stored = figma.root.getPluginData('settings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
  
  return getDefaultSettings();
}

function saveSettings(settings: Settings): void {
  try {
    figma.root.setPluginData('settings', JSON.stringify(settings));
    console.log('✓ Settings saved');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

function getDefaultSettings(): Settings {
  return {
    wcag: { version: '2.1', level: 'AA' },
    checks: {
      colorContrast: true,
      textSpacing: true,
      lineHeight: true,
      paragraphSpacing: true,
      nonTextContrast: true
    },
    display: {
      showOverlays: true,
      groupByElement: true,
      showOnlyFailures: false,
      overlayOpacity: 70
    },
    cache: {
      ttlDays: 7
    }
  };
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

function countElements(node: SceneNode): number {
  let count = 1;
  if ('children' in node) {
    for (const child of node.children) {
      count += countElements(child);
    }
  }
  return count;
}

async function analyzeFrame(frame: FrameNode, checks: any) {
  let processedElements = 0;

  async function checkNode(node: SceneNode) {
    if (isPaused) {
      await new Promise(resolve => {
        const checkPause = setInterval(() => {
          if (!isPaused) {
            clearInterval(checkPause);
            resolve(null);
          }
        }, 100);
      });
    }

    processedElements++;
    analysisProgress = Math.round((processedElements / totalElements) * 100);

    if (processedElements % 10 === 0) {
      figma.ui.postMessage({
        type: 'analysis-progress',
        progress: analysisProgress,
        current: processedElements,
        total: totalElements
      });
    }
    
    if (node.type === 'TEXT') {
      if (checks.colorContrast) {
        await checkTextContrast(node);
      }
      if (checks.textSpacing) {
        checkTextSpacing(node);
      }
      if (checks.lineHeight) {
        checkLineHeight(node);
      }
      if (checks.paragraphSpacing) {
        checkParagraphSpacing(node);
      }
    }

    if (checks.nonTextContrast && (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'VECTOR')) {
      checkNonTextContrast(node);
    }

    if ('children' in node) {
      for (const child of node.children) {
        await checkNode(child);
      }
    }
  }

  await checkNode(frame);
}

async function checkTextContrast(textNode: TextNode) {
  try {
    const fontName = textNode.fontName;
    if (fontName === figma.mixed) {
      console.log('Mixed fonts detected, skipping:', textNode.name);
      return;
    }

    try {
      await figma.loadFontAsync(fontName as FontName);
    } catch (fontError) {
      console.warn('Font loading failed for:', fontName);
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      } catch (fallbackError) {
        console.error('Fallback font also failed, skipping node');
        return;
      }
    }
    
    const fontSize = textNode.fontSize as number;
    const bgColor = getBackgroundColor(textNode);
    const textColor = getTextColor(textNode);

    if (!bgColor || !textColor) return;

    const ratio = getContrastRatio(textColor, bgColor);
    
    let fontWeight = 400;
    const rawFontWeight = textNode.fontWeight;
    
    if (typeof rawFontWeight === 'number') {
      fontWeight = rawFontWeight;
    } else if (fontName && typeof fontName === 'object' && 'style' in fontName) {
      const style = fontName.style.toLowerCase();
      if (style.includes('black') || style.includes('heavy')) fontWeight = 900;
      else if (style.includes('bold')) fontWeight = 700;
      else if (style.includes('semibold')) fontWeight = 600;
      else if (style.includes('medium')) fontWeight = 500;
      else if (style.includes('light')) fontWeight = 300;
      else if (style.includes('thin')) fontWeight = 100;
    }
    
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
    const aaRequired = isLargeText ? 3.0 : 4.5;
    const aaaRequired = isLargeText ? 4.5 : 7.0;
    const bounds = textNode.absoluteBoundingBox;

    if (ratio < aaRequired) {
      const suggestedColor = calculateBetterColor(textColor, bgColor, aaRequired);
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Color Contrast',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${ratio.toFixed(2)}:1`,
        requiredValue: `${aaRequired}:1`,
        suggestion: `Change text color to ${rgbToHex(suggestedColor)} to meet AA standards`,
        suggestedFix: { type: 'textColor', value: suggestedColor },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    } else if (ratio < aaaRequired) {
      const suggestedColor = calculateBetterColor(textColor, bgColor, aaaRequired);
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Color Contrast',
        severity: 'warning',
        wcagLevel: 'AAA',
        currentValue: `${ratio.toFixed(2)}:1`,
        requiredValue: `${aaaRequired}:1`,
        suggestion: `Change text color to ${rgbToHex(suggestedColor)} for AAA compliance`,
        suggestedFix: { type: 'textColor', value: suggestedColor },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch (error) {
    console.error('Error checking text contrast:', textNode.name, error);
  }
}

function checkTextSpacing(textNode: TextNode) {
  try {
    const fontSize = textNode.fontSize as number;
    const letterSpacing = textNode.letterSpacing as LetterSpacing;
    
    let currentSpacing = 0;
    if (letterSpacing.unit === 'PIXELS') {
      currentSpacing = letterSpacing.value;
    } else if (letterSpacing.unit === 'PERCENT') {
      currentSpacing = (letterSpacing.value / 100) * fontSize;
    }

    const requiredSpacing = fontSize * 0.12;
    const bounds = textNode.absoluteBoundingBox;

    if (currentSpacing < requiredSpacing) {
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Text Spacing',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${currentSpacing.toFixed(1)}px`,
        requiredValue: `${requiredSpacing.toFixed(1)}px (0.12em)`,
        suggestion: `Increase letter spacing to ${requiredSpacing.toFixed(1)}px`,
        suggestedFix: { type: 'letterSpacing', value: requiredSpacing },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch (error) {
    console.error('Error checking text spacing:', textNode.name, error);
  }
}

function checkLineHeight(textNode: TextNode) {
  try {
    const fontSize = textNode.fontSize as number;
    const lineHeight = textNode.lineHeight as LineHeight;
    
    let currentLineHeight = 0;
    if (lineHeight.unit === 'PIXELS') {
      currentLineHeight = lineHeight.value;
    } else if (lineHeight.unit === 'PERCENT') {
      currentLineHeight = (lineHeight.value / 100) * fontSize;
    } else {
      currentLineHeight = fontSize * 1.5;
    }

    const requiredLineHeight = fontSize * 1.5;
    const bounds = textNode.absoluteBoundingBox;

    if (currentLineHeight < requiredLineHeight) {
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Line Height',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${currentLineHeight.toFixed(1)}px`,
        requiredValue: `${requiredLineHeight.toFixed(1)}px (1.5x)`,
        suggestion: `Increase line height to ${requiredLineHeight.toFixed(1)}px`,
        suggestedFix: { type: 'lineHeight', value: requiredLineHeight },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch (error) {
    console.error('Error checking line height:', textNode.name, error);
  }
}

function checkParagraphSpacing(textNode: TextNode) {
  try {
    const fontSize = textNode.fontSize as number;
    const paragraphSpacing = textNode.paragraphSpacing;
    const requiredSpacing = fontSize * 2.0;
    const bounds = textNode.absoluteBoundingBox;

    if (paragraphSpacing < requiredSpacing) {
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Paragraph Spacing',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${paragraphSpacing.toFixed(1)}px`,
        requiredValue: `${requiredSpacing.toFixed(1)}px (2.0x)`,
        suggestion: `Increase paragraph spacing to ${requiredSpacing.toFixed(1)}px`,
        suggestedFix: { type: 'paragraphSpacing', value: requiredSpacing },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch (error) {
    console.error('Error checking paragraph spacing:', textNode.name, error);
  }
}

function checkNonTextContrast(node: SceneNode) {
  const fills = 'fills' in node ? node.fills : [];
  if (Array.isArray(fills) && fills.length > 0) {
    const fill = fills[0];
    if (fill.type === 'SOLID') {
      const bgColor = getBackgroundColor(node);
      if (bgColor) {
        const ratio = getContrastRatio(fill.color, bgColor);
        const bounds = 'absoluteBoundingBox' in node ? node.absoluteBoundingBox : null;
        if (ratio < 3.0) {
          currentIssues.push({
            elementId: node.id,
            elementName: node.name,
            issueType: 'Non-text Contrast',
            severity: 'fail',
            wcagLevel: 'AA',
            currentValue: `${ratio.toFixed(2)}:1`,
            requiredValue: `3.0:1`,
            suggestion: `Increase contrast between element and background`,
            suggestedFix: { type: 'fillColor', value: fill.color },
            bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
          });
        }
      }
    }
  }
}

// ============================================
// OVERLAY FUNCTIONS
// ============================================

async function createOverlayFrame(targetFrame: FrameNode, issues: AccessibilityIssue[]) {
  const frameBounds = targetFrame.absoluteBoundingBox;
  if (!frameBounds) return;

  console.log('Creating overlay for', issues.length, 'issues');
  clearOverlays();

  overlayFrame = figma.createFrame();
  overlayFrame.name = '🔍 A11Y Overlay';
  overlayFrame.resize(frameBounds.width, frameBounds.height);
  overlayFrame.x = frameBounds.x;
  overlayFrame.y = frameBounds.y;
  overlayFrame.fills = [];
  overlayFrame.locked = true;
  overlayFrame.opacity = 1;

  if (targetFrame.parent && 'insertChild' in targetFrame.parent) {
    const targetIndex = targetFrame.parent.children.indexOf(targetFrame);
    targetFrame.parent.insertChild(targetIndex + 1, overlayFrame);
  }

  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  } catch (error) {
    console.error('Failed to load font for overlay labels');
  }

  let createdCount = 0;
  for (const issue of issues) {
    if (issue.bounds && overlayFrame) {
      try {
        const box = figma.createRectangle();
        box.name = `Issue: ${issue.issueType}`;
        box.x = issue.bounds.x - frameBounds.x;
        box.y = issue.bounds.y - frameBounds.y;
        box.resize(issue.bounds.width, issue.bounds.height);

        const color = issue.severity === 'fail'
          ? { r: 0.95, g: 0.26, b: 0.21 }
          : { r: 1, g: 0.76, b: 0.03 };

        box.fills = [];
        box.strokes = [{ type: 'SOLID', color }];
        box.strokeWeight = 3;
        box.dashPattern = [8, 4];
        box.opacity = 0.9;

        overlayFrame.appendChild(box);

        try {
          const label = figma.createText();
          label.characters = issue.severity === 'fail' ? '✕' : '⚠';
          label.fontSize = 16;
          label.fills = [{ type: 'SOLID', color }];
          label.x = box.x - 12;
          label.y = box.y - 22;
          overlayFrame.appendChild(label);
        } catch (labelError) {
          console.warn('Failed to create label');
        }

        createdCount++;
      } catch (error) {
        console.error('Failed to create overlay element:', error);
      }
    }
  }

  figma.notify(`✓ Overlay created with ${createdCount} highlighted issues!`);
}

function clearOverlays() {
  try {
    if (overlayFrame) {
      try {
        overlayFrame.remove();
      } catch (error) {
        console.warn('Failed to remove tracked overlay');
      }
      overlayFrame = null;
    }

    const orphanedOverlays = figma.currentPage.findAll(node => node.name === '🔍 A11Y Overlay');
    orphanedOverlays.forEach(node => {
      try {
        if (node && node.parent) {
          node.remove();
        }
      } catch (error) {
        console.warn('Failed to remove orphaned overlay');
      }
    });
  } catch (error) {
    console.error('Error in clearOverlays:', error);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTextColor(node: TextNode): RGB | null {
  const fills = node.fills;
  if (Array.isArray(fills) && fills.length > 0) {
    const fill = fills[0];
    if (fill.type === 'SOLID') {
      return fill.color;
    }
  }
  return null;
}

function getBackgroundColor(node: SceneNode): RGB | null {
  let parent = node.parent;
  while (parent) {
    if ('fills' in parent) {
      const fills = parent.fills;
      if (Array.isArray(fills) && fills.length > 0) {
        const fill = fills[0];
        if (fill.type === 'SOLID') {
          return fill.color;
        }
      }
    }
    parent = parent.parent;
  }
  return { r: 1, g: 1, b: 1 };
}

function getContrastRatio(color1: RGB, color2: RGB): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color: RGB): number {
  const r = color.r <= 0.03928 ? color.r / 12.92 : Math.pow((color.r + 0.055) / 1.055, 2.4);
  const g = color.g <= 0.03928 ? color.g / 12.92 : Math.pow((color.g + 0.055) / 1.055, 2.4);
  const b = color.b <= 0.03928 ? color.b / 12.92 : Math.pow((color.b + 0.055) / 1.055, 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateBetterColor(textColor: RGB, bgColor: RGB, targetRatio: number): RGB {
  const bgLum = getLuminance(bgColor);
  const textLum = getLuminance(textColor);
  
  if (textLum > bgLum) {
    return adjustColorToRatio(textColor, bgColor, targetRatio, 'lighter');
  } else {
    return adjustColorToRatio(textColor, bgColor, targetRatio, 'darker');
  }
}

function adjustColorToRatio(color: RGB, bg: RGB, targetRatio: number, direction: 'lighter' | 'darker'): RGB {
  let newColor = { ...color };
  const step = direction === 'darker' ? -0.05 : 0.05;
  
  for (let i = 0; i < 20; i++) {
    newColor.r = Math.max(0, Math.min(1, newColor.r + step));
    newColor.g = Math.max(0, Math.min(1, newColor.g + step));
    newColor.b = Math.max(0, Math.min(1, newColor.b + step));
    
    if (getContrastRatio(newColor, bg) >= targetRatio) {
      return newColor;
    }
  }
  
  return newColor;
}

function rgbToHex(color: RGB): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function groupIssuesByElement(issues: AccessibilityIssue[]) {
  const grouped: { [key: string]: AccessibilityIssue[] } = {};
  
  issues.forEach((issue, index) => {
    const key = `${issue.elementName}_${issue.elementId}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push({ ...issue, index } as any);
  });
  
  return Object.entries(grouped).map(([key, issues]) => ({
    elementName: issues[0].elementName,
    elementId: issues[0].elementId,
    issues: issues
  }));
}

async function applyFix(issueIndex: number, fix: any) {
  const issue = currentIssues[issueIndex];
  const node = figma.getNodeById(issue.elementId);
  
  if (!node) {
    figma.ui.postMessage({ type: 'error', message: 'Element not found' });
    return;
  }

  try {
    if (fix.type === 'textColor' && node.type === 'TEXT') {
      await figma.loadFontAsync(node.fontName as FontName);
      node.fills = [{ type: 'SOLID', color: fix.value }];
    } else if (fix.type === 'letterSpacing' && node.type === 'TEXT') {
      await figma.loadFontAsync(node.fontName as FontName);
      node.letterSpacing = { value: fix.value, unit: 'PIXELS' };
    } else if (fix.type === 'lineHeight' && node.type === 'TEXT') {
      await figma.loadFontAsync(node.fontName as FontName);
      node.lineHeight = { value: fix.value, unit: 'PIXELS' };
    } else if (fix.type === 'paragraphSpacing' && node.type === 'TEXT') {
      await figma.loadFontAsync(node.fontName as FontName);
      node.paragraphSpacing = fix.value;
    }

    figma.ui.postMessage({ type: 'fix-applied', message: 'Fix applied successfully!' });
  } catch (error) {
    figma.ui.postMessage({ type: 'error', message: 'Failed to apply fix' });
  }
}
// ============================================
// ADD THIS CODE TO YOUR code.ts FILE
// ============================================

// Add this interface near the top with other interfaces
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

// Default settings
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

// ============================================
// SETTINGS FUNCTIONS
// ============================================

async function loadSettings(): Promise<UserSettings> {
  try {
    const settingsJson = await figma.clientStorage.getAsync('user-settings');
    if (settingsJson) {
      return JSON.parse(settingsJson);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
}

async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    await figma.clientStorage.setAsync('user-settings', JSON.stringify(settings));
    console.log('✓ Settings saved');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================
// ADD THIS ENTIRE SECTION (replace if exists)

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
      if (selectedFrame) {
        const issues = await analyzeFrame(selectedFrame);
        figma.ui.postMessage({
          type: 'analysis-complete',
          results: issues
        });
      }
      break;
    
    case 'get-history':
      // TODO: Implement history retrieval if using Supabase
      figma.ui.postMessage({
        type: 'history-loaded',
        history: []
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
  }
};

// ============================================
// SELECTION CHANGE HANDLER
// ============================================
// ADD THIS SECTION

figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection[0];
  
  if (selection && selection.type === 'FRAME') {
    selectedFrame = selection as FrameNode;
    figma.ui.postMessage({
      type: 'frame-selected',
      frameName: selection.name,
      frameId: selection.id
    });
  } else {
    selectedFrame = null;
    figma.ui.postMessage({
      type: 'no-frame-selected'
    });
  }
});

// Send initial selection state on plugin load
setTimeout(() => {
  const selection = figma.currentPage.selection[0];
  if (selection && selection.type === 'FRAME') {
    selectedFrame = selection as FrameNode;
    figma.ui.postMessage({
      type: 'frame-selected',
      frameName: selection.name,
      frameId: selection.id
    });
  } else {
    figma.ui.postMessage({
      type: 'no-frame-selected'
    });
  }
}, 100);

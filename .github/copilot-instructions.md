# Frame Accessibility Audit - AI Agent Instructions

## Project Overview
This is a Figma plugin that performs WCAG 2.2 accessibility audits on Figma frames, focusing on color contrast, text spacing, line height, and paragraph spacing requirements. The plugin analyzes design elements and provides suggested fixes for accessibility issues.

## Key Components

### Architecture
- `code.ts`: Main plugin logic, containing analysis algorithms and Figma API interactions
- `ui.html`: Plugin UI with integrated styles and client-side JavaScript
- Built using TypeScript and compiled to the `dist` folder

### Core Functionality
1. Frame Analysis
   - Text contrast calculation (see `checkTextContrast()` in `code.ts`)
   - Text spacing audits (see `checkTextSpacing()`, `checkLineHeight()`, `checkParagraphSpacing()`)
   - Non-text element contrast checking (`checkNonTextContrast()`)

2. Issue Management
   - Issues are tracked in `currentIssues` array with interface `AccessibilityIssue`
   - Issues are grouped by element for UI display
   - Visual indicators are added to the Figma canvas for issues

## Development Patterns

### Working with Figma API
- Always use `await figma.loadFontAsync()` before text operations
- Background colors are determined by traversing parent nodes
- Node manipulation should handle potential null cases (deleted nodes)

### Accessibility Calculations
- Color contrast uses luminance calculations (`getLuminance()`)
- Text spacing follows WCAG guidelines:
  - Letter spacing: 0.12em
  - Line height: 1.5x font size
  - Paragraph spacing: 2.0x font size

### UI Updates
- Use `figma.ui.postMessage()` for plugin-to-UI communication
- UI-to-plugin communication via `pluginMessage` events
- Always update visual indicators after applying fixes

## Critical Files
```
code.ts              # Plugin core logic
ui.html              # Combined UI, styles, and client JS
manifest.json        # Plugin configuration
```

## Common Tasks

### Adding New Checks
1. Add check configuration to checkbox group in `ui.html`
2. Create check function in `code.ts`
3. Add to `analyzeFrame()` function
4. Implement fix logic in `applyFix()`

### Modifying UI
- All styles are in `<style>` block in `ui.html`
- Components follow BEM-like naming
- Use existing color/spacing variables for consistency

### Building
```powershell
npm run build       # Compile TypeScript and copy UI
npm run watch       # Watch mode for development
```

## Testing Guidelines
- Analyze frames with mixed font styles/sizes
- Test color contrast with various background depths
- Verify fixes can be applied without errors
- Check visual indicator positioning
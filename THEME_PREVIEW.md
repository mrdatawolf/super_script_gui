# Biztech Theme Preview

## Color Palette

### Primary Colors
```
Primary Green:   #167E27  ███████  (Main brand color - buttons, accents)
Primary Hover:   #0f5a1c  ███████  (Darker green for hover states)
Primary Light:   #1a9630  ███████  (Lighter green variant)
```

### Backgrounds
```
Dark Primary:    #1a1a1a  ███████  (Main background)
Dark Secondary:  #202020  ███████  (Sidebar, cards)
Dark Tertiary:   #2a2a2a  ███████  (Input fields, elevated elements)
Light:           #f5f5f5  ███████  (Alternative light backgrounds)
```

### Text Colors
```
White Primary:   #ffffff  ███████  (Main text on dark backgrounds)
Gray Secondary:  #ABABC3  ███████  (Secondary text, subtitles)
Gray Body:       #666666  ███████  (Body text on light backgrounds)
Black Heading:   #000000  ███████  (Headings on light backgrounds)
```

### Accent Colors
```
Success Green:   #10b981  ███████  (Success states)
Error Red:       #ef4444  ███████  (Error states)
Secondary Gray:  #64748b  ███████  (Disabled, secondary actions)
```

## UI Components

### Sidebar Header
- **Background**: Linear gradient from Primary Green to Primary Hover
- **Logo**: Biztech logo (inverted to white)
- **Title**: "Script Automation"
- **Subtitle**: "PowerShell Tools by Biztech"
- **Style**: Centered, professional layout

### Script Buttons (Sidebar)
- **Default**: Dark tertiary background (#2a2a2a)
- **Hover**: Primary green background with slide-right animation
- **Active**: Primary green background (persistent)
- **Border**: Subtle borders with rounded corners (8px)
- **Transition**: Smooth 0.2s ease

### Action Buttons
- **Shape**: Fully rounded (border-radius: 9999px) - pill shaped
- **Primary**: Green background (#167E27), white text
- **Secondary**: Dark background with border
- **Hover Effect**:
  - Lifts up slightly (translateY(-1px))
  - Shadow increases for depth
  - Background darkens to hover color
- **Transition**: Smooth 0.3s ease

### Input Fields
- **Background**: Dark tertiary (#2a2a2a)
- **Border**: Subtle gray, changes to green on focus
- **Text**: White primary color
- **Border Radius**: 6px (slightly rounded)
- **Focus State**: Green border highlight

### Output Console
- **Background**: Pure black (#000)
- **Text**: Matrix green (#0f0) for that terminal feel
- **Font**: Monospace (Consolas, Courier New)
- **Border Radius**: 6px
- **Max Height**: 400px with scroll

## Layout Structure

```
┌─────────────────────────────────────────────────┐
│  [Sidebar]                  [Main Content]      │
│  ┌──────────┐              ┌──────────────────┐ │
│  │  LOGO    │              │                  │ │
│  │  Biztech │              │  Welcome Screen  │ │
│  │  Script  │              │  or              │ │
│  │  Tools   │              │  Script Detail   │ │
│  ├──────────┤              │                  │ │
│  │  Script  │              │  [Parameters]    │ │
│  │  Button  │ <── Green    │  [Buttons]       │ │
│  │  Script  │     Hover    │  [Output]        │ │
│  │  Button  │              │                  │ │
│  │  ...     │              │                  │ │
│  └──────────┘              └──────────────────┘ │
└─────────────────────────────────────────────────┘
    Dark #202020                Dark #1a1a1a
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
```

### Sizes
- **Logo**: Auto-sized (120px width)
- **Main Title**: 1.5rem (24px)
- **Section Headers**: 1.75rem (28px)
- **Subsection Headers**: 1.25rem (20px)
- **Body Text**: 0.95rem (15.2px)
- **Small Text**: 0.875rem (14px)
- **Tiny Text**: 0.75rem (12px)

## Animations & Transitions

### Button Hover
```css
transition: all 0.3s ease;
transform: translateY(-1px);
box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
```

### Script Button Hover
```css
transition: all 0.2s ease;
transform: translateX(4px);
background-color: #167E27;
```

### Input Focus
```css
transition: border-color 0.2s ease;
border-color: #167E27;
```

## Comparison to Website

### Matches trustbiztech.com:
✅ Primary green color (#167E27)
✅ Fully rounded buttons (pill shape)
✅ Professional dark theme
✅ Company logo integration
✅ Smooth hover transitions
✅ Clean, modern layout
✅ Consistent spacing and padding

### Optimized for Desktop App:
- Darker backgrounds for reduced eye strain
- Larger interactive elements for better UX
- Terminal-style output console
- Sidebar navigation for script selection

## Browser DevTools Color Picker

If you want to see these colors in action:
1. Open the app
2. Open DevTools (F12)
3. Inspect any element
4. Check the computed styles to see the Biztech color palette in use

## Screenshots

Once the app runs, you'll see:
1. **Sidebar**: Dark with green header gradient and white Biztech logo
2. **Script Buttons**: Gray buttons that turn green on hover
3. **Main Area**: Clean, dark interface with green accents
4. **Execute Button**: Green pill-shaped button
5. **Output Console**: Black terminal-style with green text

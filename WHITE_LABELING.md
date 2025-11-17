# White Labeling Guide

This application supports full white-labeling through configuration files, allowing you to customize the branding, name, logo, and theme without modifying the source code.

## Overview

Two files control the white-labeling:
1. **`branding.json`** - Controls text, logo, and branding elements
2. **`custom-theme.css`** - Controls colors, fonts, and styling

Both files are **optional**. If they don't exist, the application uses default Biztech branding.

---

## Setup Instructions

### 1. Customize Branding (Logo & Text)

**Step 1:** Copy the example file
```bash
copy branding.json.example branding.json
```

**Step 2:** Edit `branding.json` with your branding:

```json
{
  "appName": "Your Company Tools",
  "logoPath": "assets/your-logo.png",
  "windowTitle": "Your Company Tools - PowerShell Automation",
  "welcomeTitle": "Welcome to Your Company Tools",
  "welcomeSubtitle": "Select a script from the sidebar to get started",
  "companyUrl": "https://yourcompany.com"
}
```

**Step 3:** Add your logo file to the `assets/` folder

---

### 2. Customize Theme (Colors & Styling)

**Step 1:** Copy the example file
```bash
copy custom-theme.css.example custom-theme.css
```

**Step 2:** Edit `custom-theme.css` to match your brand colors:

```css
:root {
  /* Change primary brand color */
  --primary-color: #0066cc;
  --primary-hover: #0052a3;

  /* Optional: Customize other colors */
  --success-color: #10b981;
  --error-color: #ef4444;
}
```

---

## Configuration Reference

### branding.json Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `appName` | string | No | Application name shown in sidebar | `"Acme Tools"` |
| `logoPath` | string | No | Path to logo image (relative to root) | `"assets/acme-logo.png"` |
| `windowTitle` | string | No | Browser window title | `"Acme Tools - PowerShell Automation"` |
| `welcomeTitle` | string | No | Main welcome screen heading | `"Welcome to Acme Tools"` |
| `welcomeSubtitle` | string | No | Welcome screen subtitle | `"Select a script to begin"` |
| `companyUrl` | string | No | Company website URL (future use) | `"https://acme.com"` |

**Default Values:**
If `branding.json` is not found, defaults to Biztech branding:
- App Name: "Biztech Tools"
- Logo: "assets/logo.png"
- Window Title: "Biztech Tools - PowerShell Automation"

---

### custom-theme.css Variables

All CSS variables can be overridden. Here are the main ones:

#### Primary Colors
```css
--primary-color: #167E27;      /* Main brand color (buttons, highlights) */
--primary-hover: #1a9930;      /* Hover state for primary elements */
```

#### Background Colors
```css
--bg-primary: #1a1a1a;         /* Main background */
--bg-secondary: #242424;       /* Sidebar, secondary panels */
--bg-tertiary: #2d2d2d;        /* Input fields, tertiary elements */
```

#### Text Colors
```css
--text-primary: #ffffff;       /* Primary text color */
--text-secondary: #b0b0b0;     /* Secondary/muted text */
```

#### Status Colors
```css
--success-color: #10b981;      /* Success messages, indicators */
--error-color: #ef4444;        /* Error messages */
--warning-color: #f59e0b;      /* Warning messages */
```

#### Border & Accent
```css
--border-color: #3a3a3a;       /* Border color for inputs, panels */
```

---

## Example Configurations

### Example 1: Blue Corporate Theme

**branding.json:**
```json
{
  "appName": "TechCorp IT Tools",
  "logoPath": "assets/techcorp-logo.png",
  "windowTitle": "TechCorp IT Tools",
  "welcomeTitle": "Welcome to TechCorp IT Tools",
  "welcomeSubtitle": "Automated PowerShell solutions for IT professionals"
}
```

**custom-theme.css:**
```css
:root {
  --primary-color: #0066cc;
  --primary-hover: #0052a3;
  --success-color: #00aa55;
}
```

---

### Example 2: Purple Modern Theme

**branding.json:**
```json
{
  "appName": "CloudOps Studio",
  "logoPath": "assets/cloudops-logo.png",
  "windowTitle": "CloudOps Studio - Automation Platform",
  "welcomeTitle": "CloudOps Studio",
  "welcomeSubtitle": "Cloud automation made simple"
}
```

**custom-theme.css:**
```css
:root {
  --primary-color: #6a1b9a;
  --primary-hover: #8e24aa;
  --bg-secondary: #2d2040;
  --success-color: #ab47bc;
}

.sidebar {
  background: linear-gradient(180deg, #4a148c 0%, #6a1b9a 100%);
}
```

---

### Example 3: Dark Orange Theme

**custom-theme.css:**
```css
:root {
  --primary-color: #ff6b35;
  --primary-hover: #e85d31;
  --success-color: #28a745;
  --bg-primary: #0d0d0d;
  --bg-secondary: #1a1a1a;
}

.logo-container {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
}
```

---

## Logo Requirements

**Recommended Logo Specs:**
- **Format:** PNG with transparency
- **Size:** 200x200px to 400x400px
- **Aspect Ratio:** Square (1:1) or horizontal (2:1)
- **Background:** Transparent

**Logo Location:**
Place your logo in the `assets/` folder and reference it in `branding.json`:
```json
{
  "logoPath": "assets/your-logo.png"
}
```

---

## Advanced Customization

You can override **any** CSS in `custom-theme.css`. Here are some advanced examples:

### Custom Fonts
```css
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

* {
  font-family: 'Roboto', sans-serif !important;
}
```

### Gradient Backgrounds
```css
.sidebar {
  background: linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%);
}

.logo-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Button Styles
```css
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #5568d3 0%, #63408a 100%);
  transform: translateY(-2px);
}
```

### Custom Script Buttons
```css
.script-button {
  background: linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%);
  border-left: 4px solid var(--primary-color);
}

.script-button:hover {
  background: linear-gradient(135deg, #3a3a3a 0%, #454545 100%);
}
```

---

## Deployment

When distributing your white-labeled application:

1. **Include your branding files:**
   - `branding.json`
   - `custom-theme.css`
   - Your logo in `assets/`

2. **Update package.json:**
   ```json
   {
     "name": "your-company-tools",
     "productName": "Your Company Tools",
     "version": "1.0.0"
   }
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

---

## Testing Your Configuration

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Check the console** (Ctrl+Shift+I) for messages:
   - "Branding applied: Custom" - Your branding loaded successfully
   - "Branding applied: Default" - Using default Biztech branding
   - "Custom theme loaded" - Your CSS loaded successfully
   - "Using default theme" - No custom CSS found

3. **Verify the changes:**
   - Window title matches your `windowTitle`
   - Logo displays correctly
   - App name appears in sidebar
   - Welcome screen shows custom text
   - Colors match your theme

---

## Troubleshooting

### Logo not displaying
- Check that `logoPath` in `branding.json` is correct
- Verify the file exists in the specified location
- Use forward slashes: `assets/logo.png` (not backslashes)

### Custom theme not applying
- Ensure `custom-theme.css` exists in the root directory (not `.example`)
- Check CSS syntax for errors
- Open DevTools Console to see errors
- CSS must use valid syntax and selectors

### Branding not loading
- Verify `branding.json` is in the root directory
- Check JSON syntax (use a JSON validator)
- Ensure no trailing commas in JSON
- Restart the application after changes

### Colors not changing
- Make sure you're using CSS variables in `:root { }`
- Some styles may need `!important` to override
- Check browser DevTools to see which styles are applied

---

## Reverting to Default

To revert to default Biztech branding:

1. Delete or rename `branding.json`
2. Delete or rename `custom-theme.css`
3. Restart the application

---

## Support

For additional customization needs or questions:
- Check the main `README.md` for technical details
- Review `src/styles.css` for available CSS classes
- Examine `src/index.html` for element IDs and structure

---

## License

This white-labeling system is part of the Biztech Tools application and follows the same license terms.

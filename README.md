# Biztech Tools

A professional Electron-based GUI for PowerShell automation scripts, branded for [Biztech](https://trustbiztech.com/).

Featuring the Biztech signature green theme (#167E27) and corporate branding.

**🎨 Fully White-Label able** - Customize branding, logo, and theme without code changes. See [WHITE_LABELING.md](WHITE_LABELING.md) for details.

## Features

- **White-Label Ready**: Customize name, logo, and theme via config files (no code changes required)
- **Professional UI**: Clean, dark-themed interface built with Electron
- **Dynamic Forms**: Automatically generates input forms based on script parameters
- **Parameter Persistence**: Automatically saves and restores parameter values for each script (localStorage)
- **Real-time Output**: View PowerShell script output as it executes
- **UAC Elevation**: Automatic administrator privilege elevation for scripts that require it
- **Clean Output**: Filtered PowerShell output for better readability
- **Loading Indicators**: Visual spinner feedback during script execution
- **Seasonal Effects**: Date-based festive animations (winter, Valentine's, St. Patrick's, April Fools, Halloween)
- **Collapsible UI**: Accordion-style sidebar and parameter sections for better space management
- **GitHub Integration**: Download and update scripts directly from GitHub
- **Automatic Update Checking**: Checks for script updates when selecting a script from sidebar
- **Offline Support**: Bundle default script versions for offline use
- **Cross-platform**: Runs on Windows (primary target)

## Included Scripts

1. **Core Setup** - System setup and software installation
2. **Gather DNS Info** - DNS diagnostic information gathering
3. **New User** - Active Directory user creation
4. **GPO Gather** - Group Policy Object reporting
5. **Get Patch Health** - Windows Update status analysis
6. **Gather Network Data** - Network diagnostic data collection
7. **Gather Computer Info** - System information collection
8. **Disable Shadow Copy on C** - Volume Shadow Copy management (⚠️ Requires Admin)
9. **Clear Windows Update Cache** - Clears Windows Update cache and temp files (⚠️ Requires Admin)
10. **Core Fixes** - Checks for issues in core tools and attempts to fix them (⚠️ Requires Admin)
11. **Check Cloudflare Connector Versions** - Checks Cloudflare tunnel connector versions (Requires API credentials)

## Installation

### For Development

```bash
# Install dependencies
npm install

# Run the application
npm start
```

### Adding Scripts

The application expects scripts to be in `scripts/bundled/[RepoName]/[ScriptFile.ps1]`.

You have two options:

1. **Manual**: Download the scripts from GitHub and place them in the appropriate directories (see [scripts/bundled/README.md](scripts/bundled/README.md))

2. **Automatic**: Run the download script (requires GitHub access):
   ```bash
   node download-scripts.js
   ```

### Building Executable

```bash
# Build Windows executable
npm run build:win

# Output will be in the dist/ directory
```

## White Labeling

**This application is fully white-labelable!** Customize the branding, logo, and theme without touching the code.

### Quick Start

1. **Copy the example files:**
   ```bash
   copy branding.json.example branding.json
   copy custom-theme.css.example custom-theme.css
   ```

2. **Edit `branding.json`** with your company details:
   ```json
   {
     "appName": "Your Company Tools",
     "logoPath": "assets/your-logo.png",
     "windowTitle": "Your Company Tools"
   }
   ```

3. **Edit `custom-theme.css`** to match your brand colors:
   ```css
   :root {
     --primary-color: #0066cc;
     --primary-hover: #0052a3;
   }
   ```

4. **Add your logo** to the `assets/` folder

**📖 Complete Guide:** See [WHITE_LABELING.md](WHITE_LABELING.md) for detailed instructions, examples, and advanced customization.

## Project Structure

```
super_script_gui/
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Preload script (IPC bridge)
│   ├── renderer.js          # Renderer process logic
│   ├── index.html           # Main window HTML
│   ├── styles.css           # Application styles
│   ├── seasonal-effects.js  # Festive animation system
│   └── github-service.js    # GitHub API integration
├── scripts/
│   ├── scripts-config.json  # Script definitions
│   └── bundled/             # Bundled PowerShell scripts
├── assets/
│   ├── icon.png             # Application icon
│   ├── icon.ico             # Windows icon
│   └── biztech-logo.png     # Biztech logo
├── download-scripts.js      # Script downloader utility
└── package.json             # Node.js configuration
```

## Configuration

Script configurations are defined in [scripts/scripts-config.json](scripts/scripts-config.json). Each script entry includes:

- **name**: Display name
- **repo**: GitHub repository name
- **file**: PowerShell script filename
- **description**: Script description
- **githubUrl**: Full URL to repository
- **requiresAdmin**: (Optional) Set to `true` for scripts requiring administrator privileges
- **parameters**: Array of parameter definitions

### Parameter Types

- `text`: Text input
- `number`: Numeric input
- `email`: Email input
- `switch`: Boolean checkbox
- `select`: Dropdown selection
- `textarea`: Multi-line text

## Usage

1. Launch the application
2. Select a script from the sidebar (scripts with 🛡️ require administrator access)
3. Fill in the required parameters (saved values from last run will auto-load)
4. Click "Execute Script"
5. Approve UAC prompt if the script requires admin privileges
6. View real-time output in the console
7. Parameters are automatically saved on successful execution

### UI Features

- **Sidebar Toggle** (☰): Collapse/expand the script list sidebar
- **Festive Toggle** (🎉): Enable/disable date-based seasonal animations
- **Tools List Toggle** (📚): View the full list of available PowerShell tools
- **Loading Spinner**: Shows when a script is executing
- **Collapsible Parameters**: Click the "Parameters" header to collapse the form
- **Parameter Persistence**: Values saved automatically after successful execution
  - 💾 Indicator shows when saved values are loaded
  - ✕ Click the × button in the indicator to clear saved values
- **Real-time Output**: Script output streams in real-time as it executes
- **Automatic Update Checking**: Scripts are checked for updates when selected

## Development

### Tech Stack

- **Electron**: Desktop application framework
- **Node.js**: JavaScript runtime
- **PowerShell**: Script execution environment

### Key Features

- **IPC Communication**: Secure communication between main and renderer processes
- **Context Isolation**: Enhanced security through context bridge
- **Stream Processing**: Real-time output capture from PowerShell
- **UAC Elevation**: Automatic privilege elevation using Start-Process -Verb RunAs
- **Output Filtering**: Cleans PowerShell error formatting for better readability
- **Canvas Animations**: Seasonal effects using HTML5 Canvas API
- **GitHub API**: Automated script updates

## Building for Production

The application uses `electron-builder` for packaging:

```bash
npm run build
```

This creates a standalone executable that includes:
- All Node.js dependencies
- Bundled scripts
- Application assets

## License

MIT License - See [LICENSE](LICENSE) file

## Author

Created by mrdatawolf

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Troubleshooting

### Scripts not found
- Ensure scripts are placed in the correct directories under `scripts/bundled/`
- Check that filenames match those in `scripts-config.json`

### PowerShell execution errors
- For scripts requiring admin: Approve the UAC prompt when it appears
- Check execution policy: `Get-ExecutionPolicy`
- The app uses `-ExecutionPolicy Bypass` by default
- If you see "Script blocked by Windows Security", right-click the script file, select Properties, and check "Unblock"

### UAC/Admin issues
- Scripts marked with 🛡️ require administrator privileges
- UAC prompt appears automatically - just click "Yes"
- The elevated PowerShell window is hidden automatically

### Output showing "✗ Script failed with exit code: 1"
- This may be a false positive if the script uses Read-Host at the end
- The app attempts to detect this and treat it as success
- Check the actual output to verify if the script completed successfully

### GitHub rate limiting
- Unauthenticated GitHub API requests are limited to 60/hour
- Add GitHub token to `github-service.js` for higher limits

## Recent Updates (v1.1.0)

- ✅ **Parameter Persistence**: Automatically saves and restores form values using localStorage
- ✅ **Automatic Update Checking**: Scripts checked for updates when selected from sidebar
- ✅ **Tools List Integration**: View full tools repository via webview (📚 button)
- ✅ **CoreFixes Script**: Added GUI parameters for system repair operations
- ✅ **Cloudflare Connector Script**: Check tunnel connector versions with API integration
- ✅ **Comma-Separated Values**: Support for PowerShell array parameters
- ✅ **Enhanced Error Handling**: Better detection of script failures and exit codes

### Previous Updates (v1.0.x)

- ✅ UAC elevation support for admin-required scripts
- ✅ Filtered PowerShell output for cleaner display
- ✅ Loading spinner indicator during script execution
- ✅ Seasonal effects system with 5 festive themes
- ✅ Collapsible UI sections for better space management
- ✅ Admin badge (🛡️) for scripts requiring elevation

## Future Enhancements

- [ ] Add GitHub Personal Access Token support
- [ ] Add script output export (to file)
- [ ] Support for script dependencies
- [ ] Auto-update checking for the GUI itself
- [ ] Additional theme customization options
- [ ] Script execution history with timestamped logs
- [ ] Batch script execution (run multiple scripts sequentially)
- [ ] More seasonal effects and custom animation support
- [ ] Password-type input fields for sensitive parameters

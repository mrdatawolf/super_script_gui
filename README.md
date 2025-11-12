# Biztech Script Automation

A professional Electron-based GUI for PowerShell automation scripts, branded for [Biztech](https://trustbiztech.com/).

Featuring the Biztech signature green theme (#167E27) and corporate branding.

## Features

- **Biztech Branded**: Professional interface with Biztech colors and logo
- **Modern UI**: Clean, dark-themed interface built with Electron
- **Dynamic Forms**: Automatically generates input forms based on script parameters
- **Real-time Output**: View PowerShell script output as it executes
- **GitHub Integration**: Download and update scripts directly from GitHub
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
8. **Disable Shadow Copy on C** - Volume Shadow Copy management

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

## Project Structure

```
super_script_gui/
├── src/
│   ├── main.js           # Electron main process
│   ├── preload.js        # Preload script (IPC bridge)
│   ├── renderer.js       # Renderer process logic
│   ├── index.html        # Main window HTML
│   ├── styles.css        # Application styles
│   └── github-service.js # GitHub API integration
├── scripts/
│   ├── scripts-config.json   # Script definitions
│   └── bundled/              # Bundled PowerShell scripts
├── assets/
│   └── icon.png          # Application icon
├── download-scripts.js   # Script downloader utility
└── package.json          # Node.js configuration
```

## Configuration

Script configurations are defined in [scripts/scripts-config.json](scripts/scripts-config.json). Each script entry includes:

- **name**: Display name
- **repo**: GitHub repository name
- **file**: PowerShell script filename
- **description**: Script description
- **githubUrl**: Full URL to repository
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
2. Select a script from the sidebar
3. Fill in the required parameters
4. Click "Execute Script"
5. View real-time output in the console

## Development

### Tech Stack

- **Electron**: Desktop application framework
- **Node.js**: JavaScript runtime
- **PowerShell**: Script execution environment

### Key Features

- **IPC Communication**: Secure communication between main and renderer processes
- **Context Isolation**: Enhanced security through context bridge
- **Stream Processing**: Real-time output capture from PowerShell
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
- Run PowerShell as Administrator
- Check execution policy: `Get-ExecutionPolicy`
- The app uses `-ExecutionPolicy Bypass` by default

### GitHub rate limiting
- Unauthenticated GitHub API requests are limited to 60/hour
- Add GitHub token to `github-service.js` for higher limits

## Future Enhancements

- [ ] Add GitHub Personal Access Token support
- [ ] Implement script favorites/recents
- [ ] Add script output export (to file)
- [ ] Support for script dependencies
- [ ] Auto-update checking for the GUI itself
- [ ] Theme customization
- [ ] Script execution history
- [ ] Batch script execution

# PSCurrentVersionOfConnectors

Check Cloudflare tunnel connector versions and identify outdated tunnels.

## Description

This script retrieves information about Cloudflare tunnels and checks for outdated connector versions. It connects to the Cloudflare API to list all tunnels and compare their connector versions against an expected version.

## Requirements

- PowerShell 5.1 or higher
- Cloudflare account with API access
- Valid Cloudflare API credentials

## Usage

### Option 1: GUI (Recommended for Biztech Tools)

Use the Biztech Tools GUI and fill in the parameters:
- **Cloudflare Auth Email**: Your Cloudflare account email
- **Cloudflare API Key**: Your API key (visible on screen - be careful)
- **Cloudflare Account ID**: Your account ID
- **Expected Connector Version**: Version to compare against (e.g., "2025.1.0")
- **Show Detailed Output**: Check to see tunnels grouped by status

**Advantages:**
- No .env file needed
- Parameters are passed directly to the script
- Easy to use different credentials for different runs

**Security Note:** API credentials will be visible in the GUI form fields.

### Option 2: .env File (Recommended for CLI use)

1. Copy `.env.template` to `.env`:
   ```powershell
   Copy-Item .env.template .env
   ```

2. Edit `.env` with your credentials:
   ```
   AUTH_EMAIL=your_email@example.com
   AUTH_KEY=your_cloudflare_api_key
   ACCOUNT_ID=your_cloudflare_account_id
   ZONE_ID=your_zone_id
   OUTPUT_LOCATION=S:\PBIData\Biztech\CloudFlared_Versions
   CURRENT_VERSION=2025.1.0
   ```

3. Run the script:
   ```powershell
   .\PSCurrentVersionOfConnectors.ps1
   ```

4. For detailed output:
   ```powershell
   .\PSCurrentVersionOfConnectors.ps1 -More
   ```

**Advantages:**
- Credentials stored in file (keep it secure!)
- Faster for repeated use
- Can be version controlled (add .env to .gitignore!)

**Security Note:** Never commit the .env file to version control!

### Option 3: Mixed Mode (Parameters override .env)

You can use a .env file for defaults and override specific values:

```powershell
.\PSCurrentVersionOfConnectors.ps1 -CurrentVersion "2025.2.0" -More
```

This uses .env for credentials but overrides the version to check.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| AuthEmail | String | Yes* | Cloudflare account email |
| AuthKey | String | Yes* | Cloudflare API key |
| AccountId | String | Yes* | Cloudflare account ID |
| ZoneId | String | No | Cloudflare zone ID (not currently used) |
| CurrentVersion | String | No | Expected connector version (e.g., "2025.1.0") |
| OutputLocation | String | No | Output location (not currently used) |
| More | Switch | No | Show detailed tunnel information grouped by status |

*Required unless provided in .env file

## Output

The script will display:
- Authentication status
- Current connector version (if specified)
- Number of tunnels found
- List of tunnels with older connector versions
- Detailed tunnel status (if -More flag used)

## Examples

### GUI Example
Just fill in the form fields and click "Execute Script"!

### CLI Example 1: Using .env file
```powershell
.\PSCurrentVersionOfConnectors.ps1
```

### CLI Example 2: Using parameters
```powershell
.\PSCurrentVersionOfConnectors.ps1 `
  -AuthEmail "admin@example.com" `
  -AuthKey "abc123xyz" `
  -AccountId "def456uvw" `
  -CurrentVersion "2025.1.0" `
  -More
```

### CLI Example 3: Override .env version
```powershell
.\PSCurrentVersionOfConnectors.ps1 -CurrentVersion "2025.2.0"
```

## Getting Your Cloudflare Credentials

1. **API Key**: Log into Cloudflare → My Profile → API Tokens → Global API Key
2. **Account ID**: Log into Cloudflare → Select a domain → Overview → Account ID (right sidebar)
3. **Zone ID**: Log into Cloudflare → Select a domain → Overview → Zone ID (right sidebar)

## Security Best Practices

1. **Never commit .env files** to version control
2. **Use .env for CLI**, parameters for GUI (temporary use)
3. **Consider API tokens** instead of Global API Key for production
4. **Restrict API permissions** to minimum required
5. **Rotate keys regularly**

## Troubleshooting

### "Missing required credentials" error
- Ensure you've provided credentials via parameters OR .env file
- Check that .env file is in the same directory as the script
- Verify .env file has correct format (KEY=value)

### "Login failed" error
- Verify your Cloudflare email and API key are correct
- Check that the API key has proper permissions
- Ensure you're using the Global API Key or a token with sufficient permissions

### No tunnels found
- Verify the Account ID is correct
- Check that you have tunnels configured in your Cloudflare account
- Ensure the API key has access to the account

## Notes

- `ZoneId` parameter exists but is not currently used by the script
- `OutputLocation` parameter exists but is not currently used by the script
- Version comparison uses string comparison (not semantic versioning)
- Script requires internet connectivity to access Cloudflare API

## Author

Patrick Moon - 2024
Modified for GUI compatibility

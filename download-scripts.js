/**
 * Script to download default versions of PowerShell scripts from GitHub
 * Run this with: node download-scripts.js
 */

const GitHubService = require('./src/github-service');
const fs = require('fs').promises;
const path = require('path');

const githubService = new GitHubService();

// Script configurations
const scripts = [
  { repo: 'CoreSetup', file: 'CoreSetup.ps1' },
  { repo: 'PSGatherDNSInfo', file: 'Get-DNSInfo.ps1' },
  { repo: 'PSNewUser', file: 'New-DomainUser.ps1' },
  { repo: 'PSGPOGather', file: 'Get-GPOReport.ps1' },
  { repo: 'PSGetPatchHealth', file: 'Get-PatchHealth.ps1' },
  { repo: 'PSGatherNetworkData', file: 'Get-NetworkData.ps1' },
  { repo: 'PSGatherComputerInfo', file: 'Get-ComputerInfo.ps1' },
  { repo: 'PSDisableAndClearShadowCopyOnC', file: 'Disable-ShadowCopyC.ps1' }
];

async function downloadAllScripts() {
  console.log('Starting script download from GitHub...\n');

  for (const script of scripts) {
    console.log(`Downloading ${script.repo}/${script.file}...`);

    try {
      const scriptDir = path.join(__dirname, 'scripts', 'bundled', script.repo);
      const scriptPath = path.join(scriptDir, script.file);
      const versionFile = path.join(scriptDir, '.version');

      // Download script
      const result = await githubService.downloadScript(script.repo, script.file, scriptPath);

      if (result.success) {
        console.log(`  ✓ Downloaded to: ${scriptPath}`);
        console.log(`  ✓ Found at: ${result.foundPath}`);

        // Get and save version info
        const latestCommit = await githubService.getLatestCommit(script.repo);
        await githubService.saveVersionInfo(versionFile, latestCommit);
        console.log(`  ✓ Version: ${latestCommit.substring(0, 7)}`);
      } else {
        console.log(`  ✗ Failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }

    console.log('');
  }

  console.log('Download complete!');
}

// Run the download
downloadAllScripts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * Syncs all bundled PowerShell scripts from their GitHub repos.
 * Skips any script whose .version SHA already matches the latest commit.
 * Run with: node download-scripts.js
 */

const GitHubService = require('./src/github-service');
const fs = require('fs').promises;
const path = require('path');

const githubService = new GitHubService();

async function syncAllScripts() {
  const configPath = path.join(__dirname, 'scripts', 'scripts-config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

  // Only process scripts that have a GitHub repo and URL
  const scripts = config.scripts.filter(s => s.repo && s.githubUrl);

  console.log(`Checking ${scripts.length} scripts for updates...\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const script of scripts) {
    const scriptDir = path.join(__dirname, 'scripts', 'bundled', script.repo);
    const scriptPath = path.join(scriptDir, script.file);
    const versionFile = path.join(scriptDir, '.version');

    try {
      const { hasUpdate, currentVersion, latestVersion } = await githubService.checkForUpdates(script.repo, versionFile);

      if (!hasUpdate) {
        console.log(`  [skip] ${script.repo} — already at ${latestVersion.substring(0, 8)}`);
        skipped++;
        continue;
      }

      const fromLabel = currentVersion ? currentVersion.substring(0, 8) : 'none';
      console.log(`  [sync] ${script.repo} — ${fromLabel} → ${latestVersion.substring(0, 8)}`);

      const result = await githubService.downloadScript(script.repo, script.file, scriptPath);

      if (result.success) {
        await githubService.saveVersionInfo(versionFile, latestVersion);
        console.log(`         saved to ${scriptPath}`);
        updated++;
      } else {
        console.log(`         download failed`);
        failed++;
      }
    } catch (error) {
      console.log(`  [fail] ${script.repo} — ${error.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${updated} updated, ${skipped} already current, ${failed} failed.`);
}

syncAllScripts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

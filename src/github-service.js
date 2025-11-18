const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class GitHubService {
  constructor() {
    this.owner = 'mrdatawolf';
    this.baseUrl = 'api.github.com';
  }

  /**
   * Makes a GET request to GitHub API
   */
  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: url,
        method: 'GET',
        headers: {
          'User-Agent': 'SuperScriptGUI',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          } else {
            reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  /**
   * Get repository information
   */
  async getRepoInfo(repoName) {
    try {
      const url = `/repos/${this.owner}/${repoName}`;
      return await this.makeRequest(url);
    } catch (error) {
      console.error(`Error fetching repo info for ${repoName}:`, error);
      throw error;
    }
  }

  /**
   * Get contents of a file from repository
   */
  async getFileContent(repoName, filePath, branch = 'main') {
    try {
      const url = `/repos/${this.owner}/${repoName}/contents/${filePath}?ref=${branch}`;
      const response = await this.makeRequest(url);

      if (response.content) {
        // Decode base64 content
        const content = Buffer.from(response.content, 'base64').toString('utf-8');
        return content;
      }

      throw new Error('No content in response');
    } catch (error) {
      // Try master branch if main fails
      if (branch === 'main') {
        return await this.getFileContent(repoName, filePath, 'master');
      }
      console.error(`Error fetching file content from ${repoName}/${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Download script from GitHub to local bundled scripts directory
   */
  async downloadScript(repoName, fileName, destinationPath) {
    try {
      // Try common PowerShell script locations
      const possiblePaths = [
        fileName,
        `src/${fileName}`,
        `scripts/${fileName}`,
        `${repoName}.ps1`
      ];

      let content = null;
      let foundPath = null;

      for (const testPath of possiblePaths) {
        try {
          content = await this.getFileContent(repoName, testPath);
          foundPath = testPath;
          break;
        } catch (e) {
          // Continue trying other paths
          continue;
        }
      }

      if (!content) {
        throw new Error(`Could not find script file in repository ${repoName}`);
      }

      // Ensure destination directory exists
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });

      // Write file
      await fs.writeFile(destinationPath, content, 'utf-8');

      return {
        success: true,
        path: destinationPath,
        foundPath: foundPath
      };
    } catch (error) {
      console.error(`Error downloading script from ${repoName}:`, error);
      throw error;
    }
  }

  /**
   * Get latest commit SHA for a repository
   */
  async getLatestCommit(repoName, branch = 'main') {
    try {
      const url = `/repos/${this.owner}/${repoName}/commits/${branch}`;
      const response = await this.makeRequest(url);
      return response.sha;
    } catch (error) {
      // Try master branch if main fails
      if (branch === 'main') {
        return await this.getLatestCommit(repoName, 'master');
      }
      console.error(`Error fetching latest commit for ${repoName}:`, error);
      throw error;
    }
  }

  /**
   * Check if local script needs update
   */
  async checkForUpdates(repoName, localVersionFile) {
    try {
      const latestCommit = await this.getLatestCommit(repoName);

      // Read local version if exists
      try {
        const localVersion = await fs.readFile(localVersionFile, 'utf-8');
        const localCommit = localVersion.trim();

        // Also trim the latest commit for consistency
        const trimmedLatest = latestCommit.trim();
        const hasUpdate = trimmedLatest !== localCommit;

        // Debug logging
        console.log(`[Version Check] ${repoName}:`, {
          local: localCommit.substring(0, 8),
          latest: trimmedLatest.substring(0, 8),
          match: !hasUpdate
        });

        return {
          hasUpdate: hasUpdate,
          currentVersion: localCommit,
          latestVersion: trimmedLatest
        };
      } catch (e) {
        // No local version file means we need to download
        console.log(`[Version Check] ${repoName}: No local version file found`);
        return {
          hasUpdate: true,
          currentVersion: null,
          latestVersion: latestCommit.trim()
        };
      }
    } catch (error) {
      console.error(`Error checking for updates for ${repoName}:`, error);
      return {
        hasUpdate: false,
        error: error.message
      };
    }
  }

  /**
   * Save version info after download
   */
  async saveVersionInfo(versionFile, commitSha) {
    try {
      await fs.mkdir(path.dirname(versionFile), { recursive: true });
      // Ensure we write trimmed SHA without extra whitespace
      await fs.writeFile(versionFile, commitSha.trim(), 'utf-8');
      console.log(`[Version] Saved ${commitSha.trim().substring(0, 8)} to ${path.basename(path.dirname(versionFile))}`);
    } catch (error) {
      console.error('Error saving version info:', error);
    }
  }
}

module.exports = GitHubService;

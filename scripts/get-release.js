// Get release version from git commit hash or package.json version
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getRelease() {
  try {
    // Try git commit hash first
    const commitHash = execSync('git rev-parse --short HEAD', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    
    return commitHash;
  } catch {
    // Fallback to package.json version
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
      );
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
}

console.log(getRelease());

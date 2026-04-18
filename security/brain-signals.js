// ZeroLeak Autonomous Security Brain - Signal Extraction
// Extracts behavioral signals from code changes

/**
 * Extract signals from git diff
 */
function extractSignals(diff) {
  if (!diff || diff.trim() === "") {
    return {
      usesEnv: false,
      addsFetch: false,
      addsAxios: false,
      addsExternalUrl: false,
      touchesSecurity: false,
      touchesCI: false,
      addsConsoleLog: false,
      addsProcessEnvDirect: false,
      addsEnvConcatenation: false,
      fileCount: 0,
      lineCount: 0,
      isSecuritySystemUpdate: false
    };
  }

  // Check if this is a security system update
  const isSecuritySystemUpdate = /security\/(brain|secret-manager|network-guard|audit-log|alert)/.test(diff);

  const signals = {
    usesEnv: /process\.env/.test(diff),
    addsFetch: /fetch\s*\(/.test(diff),
    addsAxios: /axios\./.test(diff),
    addsExternalUrl: /https?:\/\//.test(diff),
    touchesSecurity: /security\//.test(diff),
    touchesCI: /\.github\/workflows/.test(diff),
    addsConsoleLog: /console\.log/.test(diff),
    addsProcessEnvDirect: /process\.env\.[A-Z_]+/.test(diff),
    addsEnvConcatenation: /['"][^'"]+['"]\s*\+\s*process\.env/.test(diff),
    fileCount: 0,
    lineCount: 0,
    isSecuritySystemUpdate
  };

  // Count files changed
  const fileMatches = diff.match(/a\/\S+/g);
  if (fileMatches) {
    signals.fileCount = new Set(fileMatches).size;
  }

  // Count lines changed
  const lines = diff.split("\n").filter(line => line.startsWith("+") || line.startsWith("-"));
  signals.lineCount = lines.length;

  return signals;
}

/**
 * Extract signals from a specific file
 */
function extractSignalsFromFile(filePath, content) {
  if (!content) {
    return {
      usesEnv: false,
      addsFetch: false,
      addsAxios: false,
      addsExternalUrl: false,
      touchesSecurity: false,
      touchesCI: false,
      addsConsoleLog: false,
      addsProcessEnvDirect: false,
      addsEnvConcatenation: false
    };
  }

  return {
    usesEnv: /process\.env/.test(content),
    addsFetch: /fetch\s*\(/.test(content),
    addsAxios: /axios\./.test(content),
    addsExternalUrl: /https?:\/\//.test(content),
    touchesSecurity: /security\//.test(content),
    touchesCI: /\.github\/workflows/.test(content),
    addsConsoleLog: /console\.log/.test(content),
    addsProcessEnvDirect: /process\.env\.[A-Z_]+/.test(content),
    addsEnvConcatenation: /['"][^'"]+['"]\s*\+\s*process\.env/.test(content)
  };
}

module.exports = {
  extractSignals,
  extractSignalsFromFile
};

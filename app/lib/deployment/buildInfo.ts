// Build Information for Deployment Validation
* Provides build-time metadata for debugging and version tracking

export interface BuildInfo {
  commitSha: string;
  buildTime: string;
  buildNumber: string;
  environment: string;
  version: string;
}

// Get build information
export function getBuildInfo(): BuildInfo {
  return {
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'unknown',
    buildTime: new Date().toISOString(),
    buildNumber: process.env.VERCEL_BUILD_NUMBER || 'local',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  };
}

// Log build information on startup
export function logBuildInfo() {
  const buildInfo = getBuildInfo();
  
  console.log('🚀 BacQuest Build Information:');
  console.log(`  Commit SHA: ${buildInfo.commitSha}`);
  console.log(`  Build Time: ${buildInfo.buildTime}`);
  console.log(`  Build Number: ${buildInfo.buildNumber}`);
  console.log(`  Environment: ${buildInfo.environment}`);
  console.log(`  Version: ${buildInfo.version}`);
}

// Check if deployed version matches expected
export function validateDeployment(expectedCommitSha?: string): boolean {
  const buildInfo = getBuildInfo();
  
  if (expectedCommitSha && buildInfo.commitSha !== expectedCommitSha) {
    console.error('⚠️ Deployment version mismatch detected!');
    console.error(`  Expected: ${expectedCommitSha}`);
    console.error(`  Actual: ${buildInfo.commitSha}`);
    return false;
  }
  
  console.log('✅ Deployment validation passed');
  return true;
}

// Export for use in components
export { BuildInfo };

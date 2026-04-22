/**
 * GitHub PR Service
 * Creates pull requests for auto-generated fixes
 */

export interface PullRequestResult {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  branch?: string;
  error?: string;
}

const GITHUB_API = "https://api.github.com";
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

/**
 * Create a new branch in the repository
 */
export async function createBranch(
  branchName: string,
  baseBranch: string = "main"
): Promise<{ success: boolean; sha?: string; error?: string }> {
  try {
    // Get the SHA of the base branch
    const baseResponse = await fetch(
      `${GITHUB_API}/repos/${OWNER}/${REPO}/git/refs/heads/${baseBranch}`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!baseResponse.ok) {
      const error = await baseResponse.text();
      return { success: false, error: `Failed to get base branch: ${error}` };
    }

    const baseData = await baseResponse.json();
    const baseSha = baseData.object.sha;

    // Create new branch
    const createResponse = await fetch(
      `${GITHUB_API}/repos/${OWNER}/${REPO}/git/refs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.text();
      // Branch might already exist
      if (error.includes("already exists")) {
        return { success: true, sha: baseSha };
      }
      return { success: false, error: `Failed to create branch: ${error}` };
    }

    const data = await createResponse.json();
    return { success: true, sha: data.object.sha };
  } catch (error) {
    return {
      success: false,
      error: `Branch creation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get file content and SHA
 */
export async function getFileContent(
  filePath: string,
  branch: string
): Promise<{ content?: string; sha?: string; error?: string }> {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { error: "File not found" };
      }
      const error = await response.text();
      return { error: `Failed to get file: ${error}` };
    }

    const data = await response.json();
    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return { content, sha: data.sha };
  } catch (error) {
    return {
      error: `File fetch error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update file content
 */
export async function updateFile(
  filePath: string,
  content: string,
  message: string,
  branch: string,
  sha?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const body: any = {
      message,
      content: Buffer.from(content).toString("base64"),
      branch,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to update file: ${error}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `File update error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Create a pull request
 */
export async function createPR(
  branchName: string,
  title: string,
  body: string,
  baseBranch: string = "main"
): Promise<PullRequestResult> {
  try {
    // Validate environment
    if (!OWNER || !REPO || !TOKEN) {
      return {
        success: false,
        error: "GitHub environment variables not configured (GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN)",
      };
    }

    const response = await fetch(
      `${GITHUB_API}/repos/${OWNER}/${REPO}/pulls`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          title,
          head: branchName,
          base: baseBranch,
          body,
          draft: true, // Always create as draft for safety
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to create PR: ${error}` };
    }

    const data = await response.json();
    return {
      success: true,
      prNumber: data.number,
      prUrl: data.html_url,
      branch: branchName,
    };
  } catch (error) {
    return {
      success: false,
      error: `PR creation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Full auto-fix workflow: create branch, update file, create PR
 */
export async function createAutoFixPR(params: {
  filePath: string;
  newContent: string;
  patchMessage: string;
  incidentTitle: string;
  incidentMessage?: string;
  incidentUrl?: string;
}): Promise<PullRequestResult> {
  const {
    filePath,
    newContent,
    patchMessage,
    incidentTitle,
    incidentMessage,
    incidentUrl,
  } = params;

  const branchName = `auto-fix/${Date.now()}`;

  // Step 1: Create branch
  console.log("[Auto-Fix] Creating branch:", branchName);
  const branchResult = await createBranch(branchName);
  if (!branchResult.success) {
    return { success: false, error: branchResult.error };
  }

  // Step 2: Get current file content
  console.log("[Auto-Fix] Getting current file content:", filePath);
  const fileResult = await getFileContent(filePath, branchName);
  
  // Step 3: Update file (create if doesn't exist)
  console.log("[Auto-Fix] Updating file content");
  const updateResult = await updateFile(
    filePath,
    newContent,
    `Auto-fix: ${patchMessage}`,
    branchName,
    fileResult.sha
  );
  
  if (!updateResult.success) {
    return { success: false, error: updateResult.error };
  }

  // Step 4: Create PR
  console.log("[Auto-Fix] Creating pull request");
  const prBody = generatePRBody(patchMessage, incidentTitle, incidentMessage, incidentUrl);
  
  const prResult = await createPR(
    branchName,
    `🤖 Auto-fix: ${patchMessage}`,
    prBody
  );

  return prResult;
}

/**
 * Generate PR description body
 */
function generatePRBody(
  patchMessage: string,
  incidentTitle: string,
  incidentMessage?: string,
  incidentUrl?: string
): string {
  return `## 🤖 Auto-generated Fix

This pull request was automatically generated by the incident response system.

### Original Error

**Title:** ${incidentTitle}
${incidentMessage ? `\n**Message:** ${incidentMessage}` : ""}
${incidentUrl ? `\n**Incident URL:** ${incidentUrl}` : ""}

### Fix Description

${patchMessage}

### Safety Checklist

- [ ] This is a CRITICAL incident
- [ ] Fix pattern is recognized and tested
- [ ] Change is minimal (< 20 lines)
- [ ] No breaking changes introduced
- [ ] Error handling added/improved

### Review Required

⚠️ **This PR was created automatically. Please review carefully before merging.**

- Verify the fix addresses the root cause
- Check for edge cases
- Run tests to ensure no regressions

---

*Generated by Auto-Fix Agent*`;
}

/**
 * Check if GitHub integration is configured
 */
export function isGitHubConfigured(): boolean {
  return !!(OWNER && REPO && TOKEN);
}

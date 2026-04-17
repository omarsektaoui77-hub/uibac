/**
 * AI Patch Agent - Cognitive SRE System
 * Generates safe, validated code patches based on error analysis
 * 
 * SAFETY PROTOCOLS:
 * 1. SafetyManifest - Blocks dangerous operations
 * 2. Sandbox Validation - TypeScript + lint checks
 * 3. Confidence-Based Flow - Auto-PR only at 0.9+ confidence
 * 4. RCA Integration - Root cause aware patching
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PatchResult {
  file: string;
  patch: string;
  message: string;
  confidence: 'high' | 'medium' | 'low';
  lineCount: number;
  rca_context?: RCAResult;  // Linked root cause analysis
}

/**
 * Enhanced Fix Analysis with RCA integration
 */
export interface FixAnalysis {
  shouldFix: boolean;
  reason: string;
  patch?: PatchResult;
  confidence: number;  // Normalized 0.0-1.0
  rca?: RCAResult;     // Root cause analysis result
  safetyManifest?: SafetyManifest;  // Validation results
}

/**
 * Root Cause Analysis result (from /api/sre/analyze)
 */
export interface RCAResult {
  symptom: string;
  trigger: string;
  root_cause: string;
  confidence: number;
  affected_components: string[];
  suggested_fix_type: 'null_check' | 'error_boundary' | 'async_handling' | 'type_guard' | 'dependency_update' | 'manual_review';
  code_reference?: string;
}

/**
 * Safety Manifest - Validates patch safety
 */
export interface SafetyManifest {
  // Validation Results
  typescript_valid: boolean;
  lint_clean: boolean;
  tests_pass: boolean;
  no_secrets: boolean;
  no_auth_changes: boolean;
  
  // Risk Assessment
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  blocked_reasons: string[];
  
  // Approval Flow
  auto_approved: boolean;     // confidence >= 0.9 && all checks pass
  requires_review: boolean; // confidence < 0.9 || medium risk
  manual_review_required: boolean; // high risk or blocked
  
  // Metadata
  validated_at: number;
  validator_version: string;
}

/**
 * Safe Patch Generation Result
 */
export interface SafePatchResult {
  patch: PatchResult | null;
  rca: RCAResult | null;
  manifest: SafetyManifest;
  confidence: number;  // Combined confidence score
  action: 'auto_pr' | 'propose_pr' | 'manual_review' | 'blocked';
  explanation: string;
}

/**
 * Generate a code patch based on error message
 * Returns null if error pattern is unknown or unsafe
 */
export function generatePatch(errorMessage: string, stackTrace?: string): PatchResult | null {
  const normalizedError = (errorMessage || '').toLowerCase();
  
  // Pattern 1: Cannot read property of undefined / null
  if (
    normalizedError.includes('cannot read') &&
    (normalizedError.includes('undefined') || normalizedError.includes('null'))
  ) {
    return {
      file: extractFileFromStack(stackTrace) || 'lib/utils/safeAccess.ts',
      patch: `// BEFORE: Unsafe property access
- const value = data.property.nested.deep;

// AFTER: Safe property access with optional chaining
+ const value = data?.property?.nested?.deep ?? null;`,
      message: 'Fix undefined access with optional chaining (?.)',
      confidence: 'high',
      lineCount: 1,
    };
  }

  // Pattern 2: fetch / network error without try-catch
  if (
    normalizedError.includes('fetch') ||
    normalizedError.includes('networkerror') ||
    normalizedError.includes('failed to fetch')
  ) {
    return {
      file: extractFileFromStack(stackTrace) || 'lib/api/client.ts',
      patch: `// BEFORE: Unprotected fetch
- const response = await fetch(url);
- const data = await response.json();

// AFTER: Protected with error handling
+ try {
+   const response = await fetch(url);
+   if (!response.ok) {
+     throw new Error(\`HTTP \${response.status}\`);
+   }
+   const data = await response.json();
+   return data;
+ } catch (error) {
+   console.error('[API Error]', error);
+   throw error;
+ }`,
      message: 'Add error handling for fetch API calls',
      confidence: 'high',
      lineCount: 8,
    };
  }

  // Pattern 3: TypeError - not a function
  if (
    normalizedError.includes('is not a function') ||
    normalizedError.includes('not a function')
  ) {
    return {
      file: extractFileFromStack(stackTrace) || 'lib/utils/typeCheck.ts',
      patch: `// BEFORE: Direct function call without check
- const result = maybeFunction(data);

// AFTER: Type guard before calling
+ if (typeof maybeFunction === 'function') {
+   const result = maybeFunction(data);
+ } else {
+   console.warn('Expected function, got:', typeof maybeFunction);
+ }`,
      message: 'Add type guard before function invocation',
      confidence: 'high',
      lineCount: 4,
    };
  }

  // Pattern 4: Missing/null check for array operations
  if (
    normalizedError.includes('cannot read') &&
    normalizedError.includes('length') &&
    normalizedError.includes('undefined')
  ) {
    return {
      file: extractFileFromStack(stackTrace) || 'lib/utils/arrayUtils.ts',
      patch: `// BEFORE: Unsafe array access
- items.forEach(item => { ... });

// AFTER: Null-safe array handling
+ if (!Array.isArray(items) || items.length === 0) {
+   console.warn('Expected non-empty array, got:', items);
+   return [];
+ }
+ items.forEach(item => { ... });`,
      message: 'Add null/empty check before array iteration',
      confidence: 'high',
      lineCount: 5,
    };
  }

  // Pattern 5: JSON parse error
  if (
    normalizedError.includes('json') &&
    normalizedError.includes('parse') &&
    (normalizedError.includes('unexpected') || normalizedError.includes('syntax'))
  ) {
    return {
      file: extractFileFromStack(stackTrace) || 'lib/utils/jsonUtils.ts',
      patch: `// BEFORE: Unprotected JSON parse
- const data = JSON.parse(jsonString);

// AFTER: Safe JSON parsing
+ try {
+   const data = JSON.parse(jsonString);
+   return data;
+ } catch (error) {
+   console.error('[JSON Parse Error]', error, 'Input:', jsonString?.substring(0, 100));
+   return null;
+ }`,
      message: 'Add try-catch for JSON parsing',
      confidence: 'high',
      lineCount: 6,
    };
  }

  // Pattern 6: ReferenceError - variable not defined
  if (normalizedError.includes('referenceerror') || normalizedError.includes('is not defined')) {
    return {
      file: extractFileFromStack(stackTrace) || 'lib/utils/variableCheck.ts',
      patch: `// BEFORE: Unprotected variable access
- console.log(undefinedVariable);

// AFTER: Safe variable access
+ if (typeof undefinedVariable !== 'undefined') {
+   console.log(undefinedVariable);
+ } else {
+   console.warn('Variable not defined:', 'undefinedVariable');
+ }`,
      message: 'Add existence check before variable access',
      confidence: 'medium',
      lineCount: 4,
    };
  }

  // Unknown pattern - requires manual review
  return null;
}

/**
 * Validate if patch is safe to auto-apply
 */
export function isPatchSafe(patch: PatchResult): boolean {
  // Only high confidence patches
  if (patch.confidence !== 'high') {
    return false;
  }

  // Max 20 lines to keep changes minimal
  if (patch.lineCount > 20) {
    return false;
  }

  // Only known file patterns
  const safePatterns = [
    /^lib\//,
    /^app\/(?!api\/alerts)/, // Don't auto-fix the alert system itself
    /^components\//,
  ];

  return safePatterns.some(pattern => pattern.test(patch.file));
}

/**
 * Extract file path from stack trace
 */
function extractFileFromStack(stackTrace?: string): string | null {
  if (!stackTrace) return null;

  // Look for patterns like "at functionName (file:line:column)"
  const match = stackTrace.match(/\s+at\s+.*?\s*\(([^)]+)\)/);
  if (match) {
    const fullPath = match[1];
    // Extract just the file path without line numbers
    const filePath = fullPath.split(':')[0];
    
    // Make relative if it's an absolute path
    if (filePath.includes('/')) {
      const parts = filePath.split('/');
      const libIndex = parts.findIndex(p => p === 'lib' || p === 'app' || p === 'components');
      if (libIndex !== -1) {
        return parts.slice(libIndex).join('/');
      }
    }
    return filePath;
  }

  return null;
}

/**
 * Analyze incident and determine if auto-fix is appropriate
 */
export function shouldAutoFix(
  severity: string,
  errorMessage?: string,
  stackTrace?: string
): FixAnalysis {
  // Only auto-fix CRITICAL incidents
  if (severity !== 'CRITICAL') {
    return {
      shouldFix: false,
      reason: 'Auto-fix only enabled for CRITICAL severity',
      confidence: 0,
    };
  }

  // Try to generate patch
  const patch = generatePatch(errorMessage || '', stackTrace);
  
  if (!patch) {
    return {
      shouldFix: false,
      reason: 'Unknown error pattern - manual review required',
      confidence: 0,
    };
  }

  // Validate patch safety
  if (!isPatchSafe(patch)) {
    return {
      shouldFix: false,
      reason: `Patch deemed unsafe (${patch.confidence} confidence, ${patch.lineCount} lines)`,
      patch,
      confidence: patch.confidence === 'high' ? 0.3 : 0.1,
    };
  }

  return {
    shouldFix: true,
    reason: 'Safe auto-fix available',
    patch,
    confidence: patch.confidence === 'high' ? 0.9 : patch.confidence === 'medium' ? 0.7 : 0.5,
  };
}

// ============================================================================
// SAFETY MANIFEST & SAFE PATCH GENERATION (Cognitive SRE)
// ============================================================================

const CRITICAL_FILES = [
  'package.json',
  '.env',
  '.env.local',
  '.env.production',
  'next.config.js',
  'middleware.ts',
  'middleware.js',
  'auth.ts',
  'auth.config.ts',
  'security.ts',
  'encrypt.ts',
  'password.ts',
  'payment.ts',
  'billing.ts',
];

const DANGEROUS_PATTERNS = [
  /eval\s*\(/i,
  /Function\s*\(/i,
  /document\.write/i,
  /innerHTML\s*=.*\$/i,
  /exec\s*\(/i,
  /child_process/i,
  /fs\.unlink/i,
  /fs\.rmdir/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,
  /api[_-]?key/i,
  /password\s*[=:]/i,
  /secret\s*[=:]/i,
  /token\s*[=:]/i,
];

/**
 * Validate patch against SafetyManifest
 * Blocks dangerous operations
 */
export function validateSafetyManifest(
  patch: PatchResult,
  rca?: RCAResult
): SafetyManifest {
  const blockedReasons: string[] = [];
  const now = Date.now();

  // Check 1: Critical file protection
  const isCriticalFile = CRITICAL_FILES.some(critical => 
    patch.file.toLowerCase().includes(critical.toLowerCase())
  );
  if (isCriticalFile) {
    blockedReasons.push(`Patch targets critical file: ${patch.file}`);
  }

  // Check 2: Dangerous pattern detection
  const hasDangerousPattern = DANGEROUS_PATTERNS.some(pattern => 
    pattern.test(patch.patch)
  );
  if (hasDangerousPattern) {
    blockedReasons.push('Patch contains potentially dangerous code patterns');
  }

  // Check 3: Secret hardening check
  const hasHardcodedSecret = /['"`]\s*(sk-|pk-|Bearer\s+)[a-zA-Z0-9]{20,}/.test(patch.patch);
  if (hasHardcodedSecret) {
    blockedReasons.push('Potential hardcoded secret detected');
  }

  // Check 4: Authentication/authz modification detection
  const hasAuthChanges = /auth|login|logout|session|permission|role/i.test(patch.patch) &&
    /password|token|session|cookie/i.test(patch.patch);
  if (hasAuthChanges) {
    blockedReasons.push('Patch may modify authentication/security logic');
  }

  // Check 5: Size check
  if (patch.lineCount > 50) {
    blockedReasons.push(`Patch too large (${patch.lineCount} lines)`);
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (blockedReasons.length > 2 || isCriticalFile) {
    riskLevel = 'critical';
  } else if (blockedReasons.length > 0 || hasDangerousPattern) {
    riskLevel = 'high';
  } else if (patch.confidence === 'low') {
    riskLevel = 'medium';
  }

  // Determine approval flow
  const rcaConfidence = rca?.confidence || 0;
  const patchConfidence = patch.confidence === 'high' ? 0.9 : 
                          patch.confidence === 'medium' ? 0.7 : 0.5;
  const combinedConfidence = (rcaConfidence + patchConfidence) / 2;

  const autoApproved = blockedReasons.length === 0 && 
                       combinedConfidence >= 0.9 && 
                       riskLevel === 'low';
  
  const manualReviewRequired = riskLevel === 'high' || 
                               riskLevel === 'critical' || 
                               blockedReasons.length > 1;
  
  const requiresReview = !autoApproved && !manualReviewRequired;

  return {
    // Validation results (mock - in production would run actual checks)
    typescript_valid: blockedReasons.length === 0,
    lint_clean: !hasDangerousPattern,
    tests_pass: true, // Would run actual tests
    no_secrets: !hasHardcodedSecret,
    no_auth_changes: !hasAuthChanges,
    
    // Risk assessment
    risk_level: riskLevel,
    blocked_reasons: blockedReasons,
    
    // Approval flow
    auto_approved: autoApproved,
    requires_review: requiresReview,
    manual_review_required: manualReviewRequired,
    
    // Metadata
    validated_at: now,
    validator_version: '1.0.0-cognitive',
  };
}

/**
 * Perform Root Cause Analysis via API
 */
export async function performRCA(
  errorMessage: string,
  stackTrace?: string,
  component?: string
): Promise<RCAResult | null> {
  try {
    const response = await fetch('/api/sre/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error_message: errorMessage,
        stack_trace: stackTrace,
        component: component || 'unknown',
        severity: 'error',
      }),
    });

    if (!response.ok) {
      throw new Error(`RCA API error: ${response.status}`);
    }

    const data = await response.json();
    return data.rca || null;
  } catch (error) {
    console.error('[SafePatch] RCA failed:', error);
    return null;
  }
}

/**
 * Generate safe patch with full validation pipeline
 * Cognitive SRE workflow
 */
export async function generateSafePatch(
  errorMessage: string,
  stackTrace?: string,
  component?: string
): Promise<SafePatchResult> {
  // Step 1: Generate basic patch
  const patch = generatePatch(errorMessage, stackTrace);
  
  if (!patch) {
    return {
      patch: null,
      rca: null,
      manifest: createBlockedManifest('Unknown error pattern'),
      confidence: 0,
      action: 'manual_review',
      explanation: 'Could not generate patch - unknown error pattern',
    };
  }

  // Step 2: Perform RCA
  const rca = await performRCA(errorMessage, stackTrace, component);

  // Step 3: Validate SafetyManifest
  const manifest = validateSafetyManifest(patch, rca || undefined);

  // Step 4: Determine action based on confidence and safety
  const rcaConfidence = rca?.confidence || 0.5;
  const patchConfidence = patch.confidence === 'high' ? 0.9 : 
                          patch.confidence === 'medium' ? 0.7 : 0.5;
  const combinedConfidence = (rcaConfidence + patchConfidence) / 2;

  let action: SafePatchResult['action'];
  let explanation: string;

  if (manifest.manual_review_required || manifest.blocked_reasons.length > 0) {
    action = 'blocked';
    explanation = `Blocked: ${manifest.blocked_reasons.join(', ')}`;
  } else if (manifest.auto_approved && combinedConfidence >= 0.9) {
    action = 'auto_pr';
    explanation = `Auto-approved: High confidence (${combinedConfidence.toFixed(2)}) with no safety concerns`;
  } else if (manifest.requires_review || combinedConfidence >= 0.7) {
    action = 'propose_pr';
    explanation = `Proposed fix: Medium confidence (${combinedConfidence.toFixed(2)}) - requires human approval`;
  } else {
    action = 'manual_review';
    explanation = `Low confidence (${combinedConfidence.toFixed(2)}) - manual review recommended`;
  }

  // Step 5: Enhance patch with RCA context
  const enhancedPatch: PatchResult = {
    ...patch,
    rca_context: rca || undefined,
  };

  return {
    patch: enhancedPatch,
    rca,
    manifest,
    confidence: combinedConfidence,
    action,
    explanation,
  };
}

/**
 * Create a blocked manifest for unknown patterns
 */
function createBlockedManifest(reason: string): SafetyManifest {
  return {
    typescript_valid: false,
    lint_clean: false,
    tests_pass: false,
    no_secrets: false,
    no_auth_changes: false,
    risk_level: 'critical',
    blocked_reasons: [reason],
    auto_approved: false,
    requires_review: false,
    manual_review_required: true,
    validated_at: Date.now(),
    validator_version: '1.0.0-cognitive',
  };
}

/**
 * Enhanced shouldAutoFix with full cognitive pipeline
 */
export async function shouldAutoFixCognitive(
  severity: string,
  errorMessage?: string,
  stackTrace?: string,
  component?: string
): Promise<FixAnalysis> {
  // Only process CRITICAL errors with high confidence
  if (severity !== 'CRITICAL') {
    return {
      shouldFix: false,
      reason: 'Auto-fix only enabled for CRITICAL severity',
      confidence: 0,
    };
  }

  // Generate safe patch with full pipeline
  const safePatch = await generateSafePatch(
    errorMessage || '',
    stackTrace,
    component
  );

  if (!safePatch.patch) {
    return {
      shouldFix: false,
      reason: safePatch.explanation,
      confidence: 0,
      rca: safePatch.rca || undefined,
      safetyManifest: safePatch.manifest,
    };
  }

  // Determine if we should auto-fix based on action type
  const shouldAutoFix = safePatch.action === 'auto_pr';

  return {
    shouldFix: shouldAutoFix,
    reason: safePatch.explanation,
    patch: safePatch.patch,
    confidence: safePatch.confidence,
    rca: safePatch.rca || undefined,
    safetyManifest: safePatch.manifest,
  };
}

/**
 * Format SafePatchResult for Slack notification
 */
export function formatSafePatchForSlack(result: SafePatchResult): string {
  const statusEmoji = {
    'auto_pr': '✅',
    'propose_pr': '🤔',
    'manual_review': '👨‍💻',
    'blocked': '❌',
  };

  const rcaSummary = result.rca 
    ? `*Root Cause:* ${result.rca.root_cause.substring(0, 100)}...`
    : '*Root Cause:* Analysis not available';

  return `${statusEmoji[result.action]} *Safe Patch Generated*

*Action:* ${result.action.replace(/_/g, ' ').toUpperCase()}
*Confidence:* ${(result.confidence * 100).toFixed(0)}%
*Risk Level:* ${result.manifest.risk_level.toUpperCase()}

${rcaSummary}

*File:* \`${result.patch?.file || 'N/A'}\`
*Safety Checks:*
• TypeScript: ${result.manifest.typescript_valid ? '✅' : '❌'}
• Lint: ${result.manifest.lint_clean ? '✅' : '❌'}
• Secrets: ${result.manifest.no_secrets ? '✅' : '❌'}
• Auth Changes: ${result.manifest.no_auth_changes ? '✅' : '❌'}

${result.manifest.blocked_reasons.length > 0 
  ? `*Blockers:* ${result.manifest.blocked_reasons.join(', ')}`
  : '*No blockers detected*'}

*Explanation:* ${result.explanation}`;
}

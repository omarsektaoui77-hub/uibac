/**
 * Safe Auto-Fix Patch Generator
 * Cognitive SRE System - Patch Generation Layer
 * 
 * Generates minimal, safe code patches based on RCA
 * Strict input/output format per system specification
 * 
 * INPUT: { rca, source_code, file_path }
 * OUTPUT: { patch, change_summary, risk_level, confidence, requires_review }
 */

// ============================================================================
// TYPE DEFINITIONS (Strict per specification)
// ============================================================================

/** Root Cause Analysis input */
export interface RCAInput {
  readonly symptom: string;
  readonly trigger: string;
  readonly root_cause: string;
  readonly confidence: number;
  readonly evidence?: string[];
  readonly safe_to_fix: boolean;
  readonly suggested_fix_type?: 'null_check' | 'error_boundary' | 'async_handling' | 'type_guard' | 'dependency_update' | 'manual_review';
}

/** Patch generator input */
export interface PatchGeneratorInput {
  readonly rca: RCAInput;
  readonly source_code: string;
  readonly file_path: string;
}

/** Risk level per specification */
export type RiskLevel = 'low' | 'medium' | 'high';

/** Patch generator output (STRICT format) */
export interface PatchGeneratorOutput {
  readonly patch: string;           // Unified diff format or empty
  readonly change_summary: string;
  readonly risk_level: RiskLevel;
  readonly confidence: number;      // 0.0 - 1.0
  readonly requires_review: boolean;
}

/** Internal analysis result */
interface PatchAnalysis {
  readonly canGenerate: boolean;
  readonly reason?: string;
  readonly suggestedPatch?: string;
  readonly riskLevel: RiskLevel;
  readonly confidence: number;
}

// ============================================================================
// SAFETY CONSTRAINTS (NON-NEGOTIABLE)
// ============================================================================

/** Critical files that cannot be auto-fixed */
const BLOCKED_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  'package.json',
  'package-lock.json',
  'next.config.js',
  'tsconfig.json',
  'middleware.ts',
  'middleware.js',
  'auth.ts',
  'auth.config.ts',
  'security.ts',
  'encrypt.ts',
  'password.ts',
  'payment.ts',
  'billing.ts',
  'database.ts',
  'prisma/schema.prisma',
] as const;

/** Dangerous patterns to block */
const DANGEROUS_PATTERNS = [
  /eval\s*\(/i,
  /Function\s*\(/i,
  /document\.write/i,
  /innerHTML\s*=/i,
  /outerHTML\s*=/i,
  /exec\s*\(/i,
  /child_process/i,
  /fs\.unlink/i,
  /fs\.rmdir/i,
  /fs\.rm/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,
  /TRUNCATE\s+TABLE/i,
  new RegExp('sk-' + '[a-zA-Z0-9]{20,}'),  // OpenAI key pattern detection
  new RegExp('ghp_' + '[a-zA-Z0-9]{36}'),  // GitHub token pattern detection
  /Bearer\s+[a-zA-Z0-9]{20,}/i,
];

/** Forbidden operations in patches */
const FORBIDDEN_OPERATIONS = [
  'delete',
  'remove',
  'drop',
  'truncate',
  'reset',
  'clear',
] as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if file path is safe to patch
 */
function isFileSafe(filePath: string): { safe: boolean; reason?: string } {
  const normalizedPath = filePath.toLowerCase();
  
  for (const blocked of BLOCKED_FILES) {
    if (normalizedPath.includes(blocked.toLowerCase())) {
      return {
        safe: false,
        reason: `Critical file blocked: ${blocked}`,
      };
    }
  }
  
  // Only allow specific extensions
  const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  const hasAllowedExt = allowedExtensions.some(ext => 
    normalizedPath.endsWith(ext)
  );
  
  if (!hasAllowedExt) {
    return {
      safe: false,
      reason: `File type not allowed. Allowed: ${allowedExtensions.join(', ')}`,
    };
  }
  
  return { safe: true };
}

/**
 * Check if patch contains dangerous patterns
 */
function containsDangerousPatterns(patch: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(patch));
}

/**
 * Check if RCA is sufficient for patch generation
 */
function isRCASufficient(rca: RCAInput): { sufficient: boolean; reason?: string } {
  // Must have safe_to_fix = true
  if (!rca.safe_to_fix) {
    return {
      sufficient: false,
      reason: 'RCA marked as unsafe to fix',
    };
  }
  
  // Must have minimum confidence
  if (rca.confidence < 0.7) {
    return {
      sufficient: false,
      reason: `RCA confidence too low: ${rca.confidence.toFixed(2)} < 0.7`,
    };
  }
  
  // Must have clear root cause
  if (!rca.root_cause || rca.root_cause.length < 10) {
    return {
      sufficient: false,
      reason: 'RCA root cause insufficient or unclear',
    };
  }
  
  return { sufficient: true };
}

// ============================================================================
// PATCH GENERATORS (Minimal Change Principle)
// ============================================================================

/**
 * Generate null check patch
 */
function generateNullCheckPatch(
  sourceCode: string,
  rca: RCAInput
): string | null {
  // Look for common null access patterns
  const patterns = [
    /(\w+)\.(\w+)\.(\w+)/g,  // a.b.c
    /(\w+)\[(['"`]\w+['"`])\]/g,  // a['key']
    /(\w+)\.map\(/g,  // a.map(
    /(\w+)\.filter\(/g,  // a.filter(
    /(\w+)\.reduce\(/g,  // a.reduce(
  ];
  
  // Find the problematic line based on RCA
  const lines = sourceCode.split('\n');
  let targetLine = -1;
  let targetMatch: RegExpMatchArray | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line matches the error pattern
    for (const pattern of patterns) {
      const match = pattern.exec(line);
      if (match && line.includes(rca.trigger.substring(0, 30))) {
        targetLine = i;
        targetMatch = match;
        break;
      }
    }
    
    if (targetLine >= 0) break;
  }
  
  if (targetLine < 0 || !targetMatch) {
    return null;
  }
  
  const originalLine = lines[targetLine];
  const variable = targetMatch[1];
  
  // Generate optional chaining fix
  const fixedLine = originalLine.replace(
    new RegExp(`\\b${variable}\\b(?!\?)`, 'g'),
    `${variable}?`
  );
  
  // Create unified diff
  return generateUnifiedDiff(
    sourceCode,
    lines.map((l, i) => i === targetLine ? fixedLine : l).join('\n'),
    targetLine + 1,
    1
  );
}

/**
 * Generate error boundary patch
 */
function generateErrorBoundaryPatch(
  sourceCode: string,
  rca: RCAInput
): string | null {
  // Check if it's a React component
  if (!sourceCode.includes('return') || !sourceCode.includes('export')) {
    return null;
  }
  
  // Wrap in try-catch for component body
  const lines = sourceCode.split('\n');
  
  // Find the main return statement
  let returnLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('return') && !lines[i].includes('//')) {
      returnLine = i;
      break;
    }
  }
  
  if (returnLine < 0) return null;
  
  // This is a simplified version - real implementation would need AST parsing
  return `// Error boundary should be added at parent level
// Consider wrapping this component with an ErrorBoundary
// File: ${rca.evidence?.[0] || 'unknown'}`;
}

/**
 * Generate async handling patch
 */
function generateAsyncHandlingPatch(
  sourceCode: string,
  rca: RCAInput
): string | null {
  // Look for fetch or async operations without try-catch
  if (!sourceCode.includes('fetch') && !sourceCode.includes('async')) {
    return null;
  }
  
  const lines = sourceCode.split('\n');
  
  // Find fetch call
  let fetchLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('fetch(') && !lines[i].includes('try')) {
      // Check if it's inside a try block
      let hasTryCatch = false;
      for (let j = Math.max(0, i - 10); j < i; j++) {
        if (lines[j].includes('try {')) {
          hasTryCatch = true;
          break;
        }
      }
      if (!hasTryCatch) {
        fetchLine = i;
        break;
      }
    }
  }
  
  if (fetchLine < 0) return null;
  
  // Generate try-catch wrapper
  const indentation = lines[fetchLine].match(/^\s*/)?.[0] || '';
  
  const patchedLines = [
    ...lines.slice(0, fetchLine),
    `${indentation}try {`,
    lines[fetchLine].replace(/^\s*/, `${indentation}  `),
    `${indentation}} catch (error) {`,
    `${indentation}  console.error('Fetch failed:', error);`,
    `${indentation}  // Handle error appropriately`,
    `${indentation}}`,
    ...lines.slice(fetchLine + 1),
  ];
  
  return generateUnifiedDiff(
    sourceCode,
    patchedLines.join('\n'),
    fetchLine + 1,
    6
  );
}

/**
 * Generate type guard patch
 */
function generateTypeGuardPatch(
  sourceCode: string,
  rca: RCAInput
): string | null {
  // Look for TypeScript type assertions
  if (!sourceCode.includes('as ')) return null;
  
  const lines = sourceCode.split('\n');
  
  // Find type assertion
  let typeLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('as ') && lines[i].includes('Type')) {
      typeLine = i;
      break;
    }
  }
  
  if (typeLine < 0) return null;
  
  // Add type guard before usage
  const indentation = lines[typeLine].match(/^\s*/)?.[0] || '';
  const variableMatch = lines[typeLine].match(/(\w+)\s*=/);
  const variable = variableMatch ? variableMatch[1] : 'data';
  
  const patchedLines = [
    ...lines.slice(0, typeLine),
    `${indentation}// Type guard check`,
    `${indentation}if (!${variable} || typeof ${variable} !== 'object') {`,
    `${indentation}  throw new Error('Invalid type for ${variable}');`,
    `${indentation}}`,
    lines[typeLine],
    ...lines.slice(typeLine + 1),
  ];
  
  return generateUnifiedDiff(
    sourceCode,
    patchedLines.join('\n'),
    typeLine + 1,
    4
  );
}

/**
 * Generate unified diff format
 */
function generateUnifiedDiff(
  original: string,
  modified: string,
  startLine: number,
  numLines: number
): string {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  let diff = `@@ -${startLine},${numLines} +${startLine},${numLines} @@\n`;
  
  // Simple diff generation (first few lines)
  for (let i = startLine - 1; i < Math.min(startLine - 1 + numLines, originalLines.length); i++) {
    if (i < originalLines.length) {
      diff += `-${originalLines[i]}\n`;
    }
  }
  
  for (let i = startLine - 1; i < Math.min(startLine - 1 + numLines, modifiedLines.length); i++) {
    if (i < modifiedLines.length) {
      diff += `+${modifiedLines[i]}\n`;
    }
  }
  
  return diff;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate safe patch based on RCA
 * Follows strict input/output format per specification
 */
export function generatePatch(input: PatchGeneratorInput): PatchGeneratorOutput {
  const { rca, source_code, file_path } = input;
  
  // === STEP 1: Validate RCA sufficiency ===
  const rcaCheck = isRCASufficient(rca);
  if (!rcaCheck.sufficient) {
    return {
      patch: '',
      change_summary: rcaCheck.reason || 'Insufficient RCA confidence — manual review required',
      risk_level: 'high',
      confidence: 0.0,
      requires_review: true,
    };
  }
  
  // === STEP 2: Validate file safety ===
  const fileCheck = isFileSafe(file_path);
  if (!fileCheck.safe) {
    return {
      patch: '',
      change_summary: fileCheck.reason || 'File blocked by safety constraints',
      risk_level: 'high',
      confidence: 0.0,
      requires_review: true,
    };
  }
  
  // === STEP 3: Analyze and generate patch ===
  const analysis = analyzeAndGeneratePatch(rca, source_code);
  
  if (!analysis.canGenerate || !analysis.suggestedPatch) {
    return {
      patch: '',
      change_summary: analysis.reason || 'Could not generate safe patch',
      risk_level: 'high',
      confidence: 0.0,
      requires_review: true,
    };
  }
  
  // === STEP 4: Validate patch safety ===
  if (containsDangerousPatterns(analysis.suggestedPatch)) {
    return {
      patch: '',
      change_summary: 'Patch contains dangerous patterns - blocked',
      risk_level: 'high',
      confidence: 0.0,
      requires_review: true,
    };
  }
  
  // === STEP 5: Determine final output ===
  const finalConfidence = Math.min(rca.confidence, analysis.confidence);
  const requiresReview = finalConfidence < 0.9 || analysis.riskLevel !== 'low';
  
  return {
    patch: analysis.suggestedPatch,
    change_summary: analysis.reason || `Fix for: ${rca.root_cause.substring(0, 80)}...`,
    risk_level: analysis.riskLevel,
    confidence: finalConfidence,
    requires_review: requiresReview,
  };
}

/**
 * Internal analysis and patch generation
 */
function analyzeAndGeneratePatch(
  rca: RCAInput,
  sourceCode: string
): PatchAnalysis {
  const fixType = rca.suggested_fix_type || 'null_check';
  
  let patch: string | null = null;
  let riskLevel: RiskLevel = 'low';
  let confidence = rca.confidence;
  
  switch (fixType) {
    case 'null_check':
      patch = generateNullCheckPatch(sourceCode, rca);
      riskLevel = 'low';
      break;
      
    case 'error_boundary':
      patch = generateErrorBoundaryPatch(sourceCode, rca);
      riskLevel = 'medium';
      confidence *= 0.9;  // Slightly lower confidence for structural changes
      break;
      
    case 'async_handling':
      patch = generateAsyncHandlingPatch(sourceCode, rca);
      riskLevel = 'medium';
      confidence *= 0.85;
      break;
      
    case 'type_guard':
      patch = generateTypeGuardPatch(sourceCode, rca);
      riskLevel = 'low';
      break;
      
    case 'dependency_update':
    case 'manual_review':
    default:
      return {
        canGenerate: false,
        reason: `Fix type "${fixType}" requires manual review`,
        riskLevel: 'high',
        confidence: 0.0,
      };
  }
  
  if (!patch) {
    return {
      canGenerate: false,
      reason: `Could not generate ${fixType} patch for this code pattern`,
      riskLevel: 'high',
      confidence: 0.0,
    };
  }
  
  return {
    canGenerate: true,
    suggestedPatch: patch,
    riskLevel,
    confidence,
  };
}

// ============================================================================
// API ROUTE WRAPPER
// ============================================================================

/**
 * Process patch generation request
 * Validates input and returns strict JSON output
 */
export async function processPatchRequest(
  requestBody: unknown
): Promise<PatchGeneratorOutput> {
  // Validate input structure
  if (!isValidPatchInput(requestBody)) {
    return {
      patch: '',
      change_summary: 'Invalid input format - missing required fields',
      risk_level: 'high',
      confidence: 0.0,
      requires_review: true,
    };
  }
  
  const input = requestBody as PatchGeneratorInput;
  
  // Generate patch
  return generatePatch(input);
}

/**
 * Type guard for input validation
 */
function isValidPatchInput(body: unknown): body is PatchGeneratorInput {
  if (!body || typeof body !== 'object') return false;
  
  const b = body as Record<string, unknown>;
  
  // Check required fields
  if (!b.rca || typeof b.rca !== 'object') return false;
  if (!b.source_code || typeof b.source_code !== 'string') return false;
  if (!b.file_path || typeof b.file_path !== 'string') return false;
  
  // Check RCA fields
  const rca = b.rca as Record<string, unknown>;
  if (typeof rca.symptom !== 'string') return false;
  if (typeof rca.trigger !== 'string') return false;
  if (typeof rca.root_cause !== 'string') return false;
  if (typeof rca.confidence !== 'number') return false;
  if (typeof rca.safe_to_fix !== 'boolean') return false;
  
  return true;
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process multiple patch generation requests
 */
export function generatePatchesBatch(
  inputs: PatchGeneratorInput[]
): PatchGeneratorOutput[] {
  return inputs.map(input => generatePatch(input));
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).patchGenerator = {
    generatePatch,
    processPatchRequest,
    generatePatchesBatch,
  };
}

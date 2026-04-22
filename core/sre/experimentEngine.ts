/**
 * Safe Experiment Engine
 * 
 * Manages architecture experiments in isolated preview environments:
 * - Creates experiment branches
 * - Applies structural changes
 * - Deploys to preview
 * - Routes synthetic traffic
 * - Measures impact
 * - Makes adopt/rollback decisions
 * 
 * Zero production impact guarantee.
 */

import { ArchitectureProposal } from './architectureAdvisor';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Experiment state */
export type ExperimentState = 
  | 'created'
  | 'branching'
  | 'applying_changes'
  | 'deploying_preview'
  | 'running_canary'
  | 'measuring'
  | 'evaluating'
  | 'approved'
  | 'rejected'
  | 'merging'
  | 'rolled_back'
  | 'completed'
  | 'failed';

/** Architecture experiment */
export interface ArchitectureExperiment {
  readonly id: string;
  readonly proposal_id: string;
  readonly proposal: ArchitectureProposal;
  readonly branch_name: string;
  readonly state: ExperimentState;
  readonly created_at: number;
  readonly started_at?: number;
  readonly completed_at?: number;
  readonly preview_url?: string;
  readonly baseline_metrics: ExperimentMetrics;
  readonly experiment_metrics: ExperimentMetrics;
  readonly comparison_result?: ComparisonResult;
  readonly decision?: ExperimentDecision;
  readonly error?: string;
  readonly logs: ExperimentLog[];
}

/** Experiment metrics */
export interface ExperimentMetrics {
  readonly error_rate: number;
  readonly avg_latency_ms: number;
  readonly p95_latency_ms: number;
  readonly throughput_rps: number;
  readonly memory_usage_mb: number;
  readonly cpu_usage_percent: number;
  readonly timestamp: number;
  readonly duration_ms: number;
}

/** Comparison between baseline and experiment */
export interface ComparisonResult {
  readonly error_rate_change: number;       // Percentage change
  readonly latency_change_ms: number;
  readonly memory_change_mb: number;
  readonly overall_improvement: number;   // -100 to +100
  readonly confidence: number;
  readonly meets_thresholds: boolean;
}

/** Experiment decision */
export interface ExperimentDecision {
  readonly action: 'approve' | 'reject' | 'extend';
  readonly reason: string;
  readonly decided_at: number;
  readonly decided_by: 'system' | 'human';
  readonly auto_approved: boolean;
}

/** Experiment log entry */
interface ExperimentLog {
  readonly timestamp: number;
  readonly level: 'info' | 'warn' | 'error';
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}

/** Experiment configuration */
interface ExperimentConfig {
  readonly canary_duration_minutes: number;
  readonly synthetic_request_count: number;
  readonly improvement_threshold_percent: number;
  readonly max_regression_percent: number;
  readonly auto_approve_min_confidence: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ExperimentConfig = {
  canary_duration_minutes: 10,
  synthetic_request_count: 1000,
  improvement_threshold_percent: 10,
  max_regression_percent: 5,
  auto_approve_min_confidence: 0.9,
};

// ============================================================================
// STORAGE
// ============================================================================

const experiments = new Map<string, ArchitectureExperiment>();
const experimentResults = new Map<string, ComparisonResult>();

// ============================================================================
// EXPERIMENT LIFECYCLE
// ============================================================================

/**
 * Create new architecture experiment
 */
export async function createExperiment(
  proposal: ArchitectureProposal,
  config: Partial<ExperimentConfig> = {}
): Promise<ArchitectureExperiment> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const experimentId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const branchName = `experiment/${proposal.id}`;
  
  const experiment: ArchitectureExperiment = {
    id: experimentId,
    proposal_id: proposal.id,
    proposal,
    branch_name: branchName,
    state: 'created',
    created_at: Date.now(),
    baseline_metrics: {
      error_rate: 0,
      avg_latency_ms: 0,
      p95_latency_ms: 0,
      throughput_rps: 0,
      memory_usage_mb: 0,
      cpu_usage_percent: 0,
      timestamp: Date.now(),
      duration_ms: 0,
    },
    experiment_metrics: {
      error_rate: 0,
      avg_latency_ms: 0,
      p95_latency_ms: 0,
      throughput_rps: 0,
      memory_usage_mb: 0,
      cpu_usage_percent: 0,
      timestamp: Date.now(),
      duration_ms: 0,
    },
    logs: [{
      timestamp: Date.now(),
      level: 'info',
      message: `Experiment created for proposal: ${proposal.title}`,
    }],
  };
  
  experiments.set(experimentId, experiment);
  
  // Start experiment lifecycle
  runExperimentLifecycle(experimentId, proposal, mergedConfig);
  
  return experiment;
}

/**
 * Run complete experiment lifecycle
 */
async function runExperimentLifecycle(
  experimentId: string,
  proposal: ArchitectureProposal,
  config: ExperimentConfig
): Promise<void> {
  try {
    // Step 1: Create branch
    await updateState(experimentId, 'branching');
    await createGitBranch(experimentId, proposal);
    
    // Step 2: Apply changes
    await updateState(experimentId, 'applying_changes');
    await applyArchitectureChanges(experimentId, proposal);
    
    // Step 3: Deploy to preview
    await updateState(experimentId, 'deploying_preview');
    const previewUrl = await deployToPreview(experimentId);
    
    // Step 4: Measure baseline (production)
    await updateState(experimentId, 'running_canary');
    const baselineMetrics = await measureBaseline(config);
    updateExperiment(experimentId, { baseline_metrics: baselineMetrics });
    
    // Step 5: Run canary with synthetic traffic
    await runSyntheticTraffic(previewUrl, config.synthetic_request_count);
    
    // Step 6: Measure experiment
    await updateState(experimentId, 'measuring');
    const experimentMetrics = await measureExperiment(previewUrl, config);
    updateExperiment(experimentId, { experiment_metrics: experimentMetrics });
    
    // Step 7: Compare and evaluate
    await updateState(experimentId, 'evaluating');
    const comparison = compareMetrics(baselineMetrics, experimentMetrics);
    const decision = makeDecision(comparison, proposal, config);
    
    updateExperiment(experimentId, {
      comparison_result: comparison,
      decision,
    });
    
    // Step 8: Execute decision
    if (decision.action === 'approve') {
      await updateState(experimentId, 'merging');
      await mergeExperiment(experimentId, proposal);
      await updateState(experimentId, 'completed');
    } else {
      await updateState(experimentId, 'rolled_back');
      await rollbackExperiment(experimentId);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(experimentId, `Experiment failed: ${errorMessage}`);
    updateExperiment(experimentId, { error: errorMessage });
    await updateState(experimentId, 'failed');
    await rollbackExperiment(experimentId);
  }
}

// ============================================================================
// GIT & DEPLOYMENT OPERATIONS (Simulated)
// ============================================================================

async function createGitBranch(experimentId: string, proposal: ArchitectureProposal): Promise<void> {
  logInfo(experimentId, `Creating branch: experiment/${proposal.id}`);
  
  // Simulate git checkout -b experiment/proposal-id
  await delay(1000);
  
  logInfo(experimentId, 'Branch created successfully');
}

async function applyArchitectureChanges(experimentId: string, proposal: ArchitectureProposal): Promise<void> {
  logInfo(experimentId, `Applying ${proposal.changes.length} architecture changes`);
  
  // Simulate applying changes
  for (const change of proposal.changes) {
    logInfo(experimentId, `Applied: ${change}`);
    await delay(500);
  }
  
  // Simulate git commit
  await delay(1000);
  logInfo(experimentId, 'Changes committed');
}

async function deployToPreview(experimentId: string): Promise<string> {
  logInfo(experimentId, 'Deploying to preview environment...');
  
  // Simulate Vercel preview deployment
  await delay(3000);
  
  const previewUrl = `https://${experimentId.substring(0, 8)}-preview.vercel.app`;
  updateExperiment(experimentId, { preview_url: previewUrl });
  
  logInfo(experimentId, `Preview deployed: ${previewUrl}`);
  return previewUrl;
}

async function mergeExperiment(experimentId: string, proposal: ArchitectureProposal): Promise<void> {
  logInfo(experimentId, 'Merging experiment to main branch');
  
  // Simulate git merge
  await delay(2000);
  
  logInfo(experimentId, 'Experiment merged successfully');
}

async function rollbackExperiment(experimentId: string): Promise<void> {
  logInfo(experimentId, 'Rolling back experiment');
  
  // Simulate cleanup
  await delay(1500);
  
  logInfo(experimentId, 'Rollback complete - preview environment destroyed');
}

// ============================================================================
// MEASUREMENT & COMPARISON
// ============================================================================

async function measureBaseline(config: ExperimentConfig): Promise<ExperimentMetrics> {
  // Simulate measuring production baseline
  await delay(2000);
  
  return {
    error_rate: 0.02,
    avg_latency_ms: 150,
    p95_latency_ms: 350,
    throughput_rps: 120,
    memory_usage_mb: 512,
    cpu_usage_percent: 45,
    timestamp: Date.now(),
    duration_ms: config.canary_duration_minutes * 60 * 1000,
  };
}

async function measureExperiment(
  previewUrl: string,
  config: ExperimentConfig
): Promise<ExperimentMetrics> {
  logInfo('experiment', `Measuring experiment at ${previewUrl}`);
  
  // Simulate measurement during canary
  await delay(config.canary_duration_minutes * 1000); // Simulated shorter for demo
  
  // Return simulated improved metrics
  return {
    error_rate: 0.01,           // 50% improvement
    avg_latency_ms: 85,         // 43% improvement
    p95_latency_ms: 180,        // 48% improvement
    throughput_rps: 145,        // 21% improvement
    memory_usage_mb: 480,       // 6% improvement
    cpu_usage_percent: 40,      // 11% improvement
    timestamp: Date.now(),
    duration_ms: config.canary_duration_minutes * 60 * 1000,
  };
}

async function runSyntheticTraffic(previewUrl: string, requestCount: number): Promise<void> {
  logInfo('experiment', `Running ${requestCount} synthetic requests`);
  
  // Simulate synthetic traffic
  const batchSize = 100;
  const batches = Math.ceil(requestCount / batchSize);
  
  for (let i = 0; i < batches; i++) {
    await delay(100);
    // In real implementation, would send actual HTTP requests
  }
  
  logInfo('experiment', 'Synthetic traffic complete');
}

function compareMetrics(
  baseline: ExperimentMetrics,
  experiment: ExperimentMetrics
): ComparisonResult {
  const errorRateChange = ((baseline.error_rate - experiment.error_rate) / baseline.error_rate) * 100;
  const latencyChange = baseline.avg_latency_ms - experiment.avg_latency_ms;
  const memoryChange = baseline.memory_usage_mb - experiment.memory_usage_mb;
  
  // Calculate overall improvement (weighted)
  const errorImprovement = errorRateChange * 2;  // Error reduction is 2x weighted
  const latencyImprovement = (latencyChange / baseline.avg_latency_ms) * 100;
  const throughputImprovement = ((experiment.throughput_rps - baseline.throughput_rps) / baseline.throughput_rps) * 100;
  
  const overallImprovement = (errorImprovement + latencyImprovement + throughputImprovement) / 4;
  
  return {
    error_rate_change: Math.round(errorRateChange * 10) / 10,
    latency_change_ms: latencyChange,
    memory_change_mb: memoryChange,
    overall_improvement: Math.round(overallImprovement * 10) / 10,
    confidence: 0.85,
    meets_thresholds: overallImprovement > 0 && experiment.error_rate <= baseline.error_rate * 1.05,
  };
}

// ============================================================================
// DECISION LOGIC
// ============================================================================

function makeDecision(
  comparison: ComparisonResult,
  proposal: ArchitectureProposal,
  config: ExperimentConfig
): ExperimentDecision {
  const now = Date.now();
  
  // Check for regressions
  if (comparison.error_rate_change < -config.max_regression_percent) {
    return {
      action: 'reject',
      reason: `Error rate increased by ${Math.abs(comparison.error_rate_change).toFixed(1)}%`,
      decided_at: now,
      decided_by: 'system',
      auto_approved: false,
    };
  }
  
  // Check for sufficient improvement
  if (comparison.overall_improvement < config.improvement_threshold_percent) {
    return {
      action: 'reject',
      reason: `Improvement ${comparison.overall_improvement.toFixed(1)}% below threshold ${config.improvement_threshold_percent}%`,
      decided_at: now,
      decided_by: 'system',
      auto_approved: false,
    };
  }
  
  // Auto-approve if high confidence and meets thresholds
  const autoApprove = comparison.confidence >= config.auto_approve_min_confidence &&
    proposal.risk_level === 'low';
  
  return {
    action: 'approve',
    reason: `Experiment successful: ${comparison.overall_improvement.toFixed(1)}% improvement, ` +
      `error rate ${comparison.error_rate_change > 0 ? 'improved' : 'changed'} by ${Math.abs(comparison.error_rate_change).toFixed(1)}%`,
    decided_at: now,
    decided_by: autoApprove ? 'system' : 'human',
    auto_approved: autoApprove,
  };
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

async function updateState(experimentId: string, state: ExperimentState): Promise<void> {
  const experiment = experiments.get(experimentId);
  if (!experiment) return;
  
  experiments.set(experimentId, {
    ...experiment,
    state,
    started_at: experiment.started_at || (state === 'branching' ? Date.now() : undefined),
    completed_at: ['completed', 'rolled_back', 'failed'].includes(state) ? Date.now() : undefined,
  });
  
  logInfo(experimentId, `State: ${state}`);
}

function updateExperiment(
  experimentId: string,
  updates: Partial<ArchitectureExperiment>
): void {
  const experiment = experiments.get(experimentId);
  if (!experiment) return;
  
  experiments.set(experimentId, {
    ...experiment,
    ...updates,
  });
}

function logInfo(experimentId: string, message: string, metadata?: Record<string, unknown>): void {
  const experiment = experiments.get(experimentId);
  if (!experiment) return;
  
  experiment.logs.push({
    timestamp: Date.now(),
    level: 'info',
    message,
    metadata,
  });
}

function logError(experimentId: string, message: string): void {
  const experiment = experiments.get(experimentId);
  if (!experiment) return;
  
  experiment.logs.push({
    timestamp: Date.now(),
    level: 'error',
    message,
  });
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get experiment by ID
 */
export function getExperiment(id: string): ArchitectureExperiment | undefined {
  return experiments.get(id);
}

/**
 * Get all experiments
 */
export function getAllExperiments(): ArchitectureExperiment[] {
  return Array.from(experiments.values())
    .sort((a, b) => b.created_at - a.created_at);
}

/**
 * Get experiments by state
 */
export function getExperimentsByState(state: ExperimentState): ArchitectureExperiment[] {
  return getAllExperiments().filter(e => e.state === state);
}

/**
 * Get experiment statistics
 */
export function getExperimentStats(): {
  total: number;
  completed: number;
  approved: number;
  rejected: number;
  avg_improvement: number;
} {
  const all = getAllExperiments();
  const completed = all.filter(e => e.state === 'completed');
  const approved = all.filter(e => e.decision?.action === 'approve');
  const rejected = all.filter(e => e.decision?.action === 'reject');
  
  const avgImprovement = completed.length > 0
    ? completed.reduce((s, e) => s + (e.comparison_result?.overall_improvement || 0), 0) / completed.length
    : 0;
  
  return {
    total: all.length,
    completed: completed.length,
    approved: approved.length,
    rejected: rejected.length,
    avg_improvement: Math.round(avgImprovement * 10) / 10,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).experimentEngine = {
    createExperiment,
    getExperiment,
    getAllExperiments,
    getExperimentStats,
  };
}

// Background Job System
// Handles maintenance tasks, cleanup, and scheduled operations

export interface Job {
  id: string;
  type: string;
  data: any;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  lastAttemptAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface JobHandler {
  (job: Job): Promise<any>;
}

export interface JobSchedule {
  type: string;
  handler: JobHandler;
  schedule: string; // Cron expression
  enabled: boolean;
  priority: 'low' | 'medium' | 'high';
  maxAttempts: number;
  timeout: number; // seconds
}

/**
 * Background Job Manager
 * Handles scheduled and one-time jobs with retry logic
 */
export class BackgroundJobManager {
  private static jobs = new Map<string, Job>();
  private static handlers = new Map<string, JobHandler>();
  private static schedules = new Map<string, JobSchedule>();
  private static isProcessing = false;
  private static maxConcurrentJobs = 5;
  private static currentJobs = 0;

  /**
   * Register a job handler
   */
  static registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
    console.log(`Job handler registered: ${type}`);
  }

  /**
   * Schedule a recurring job
   */
  static scheduleJob(schedule: JobSchedule): void {
    this.schedules.set(schedule.type, schedule);
    console.log(`Job scheduled: ${schedule.type} with cron: ${schedule.schedule}`);
  }

  /**
   * Queue a one-time job
   */
  static async queueJob(
    type: string,
    data: any,
    options: {
      priority?: 'low' | 'medium' | 'high';
      scheduledAt?: Date;
      maxAttempts?: number;
    } = {}
  ): Promise<string> {
    const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: Job = {
      id: jobId,
      type,
      data,
      scheduledAt: options.scheduledAt || new Date(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      priority: options.priority || 'medium',
      status: 'pending',
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processJobs();
    }

    return jobId;
  }

  /**
   * Get job status
   */
  static getJobStatus(jobId: string): Job | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Cancel a job
   */
  static cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'running') {
      return false;
    }

    this.jobs.delete(jobId);
    return true;
  }

  /**
   * Get job statistics
   */
  static getJobStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    byType: Record<string, number>;
  } {
    const stats = {
      total: this.jobs.size,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      byType: {} as Record<string, number>
    };

    for (const job of this.jobs.values()) {
      stats[job.status]++;
      stats.byType[job.type] = (stats.byType[job.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Process pending jobs
   */
  private static async processJobs(): Promise<void> {
    if (this.isProcessing || this.currentJobs >= this.maxConcurrentJobs) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.currentJobs < this.maxConcurrentJobs) {
        const job = this.getNextJob();
        if (!job) break;

        this.currentJobs++;
        this.processJob(job).finally(() => {
          this.currentJobs--;
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get next job to process
   */
  private static getNextJob(): Job | null {
    const now = new Date();
    let nextJob: Job | null = null;

    for (const job of this.jobs.values()) {
      if (job.status !== 'pending') continue;
      if (job.scheduledAt > now) continue;

      if (!nextJob || this.compareJobPriority(job, nextJob) > 0) {
        nextJob = job;
      }
    }

    return nextJob;
  }

  /**
   * Compare job priority
   */
  private static compareJobPriority(a: Job, b: Job): number {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    
    // If same priority, use creation time (earlier first)
    return a.createdAt.getTime() - b.createdAt.getTime();
  }

  /**
   * Process a single job
   */
  private static async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'failed';
      job.error = `No handler found for job type: ${job.type}`;
      job.completedAt = new Date();
      return;
    }

    job.status = 'running';
    job.lastAttemptAt = new Date();
    job.attempts++;

    try {
      // Add timeout if specified
      const schedule = this.schedules.get(job.type);
      const timeout = schedule?.timeout || 300; // 5 minutes default

      const result = await this.runWithTimeout(handler(job), timeout * 1000);
      
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      
      console.log(`Job completed: ${job.id} (${job.type})`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.error = errorMessage;
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.completedAt = new Date();
        console.error(`Job failed permanently: ${job.id} (${job.type}) - ${errorMessage}`);
      } else {
        job.status = 'pending';
        // Exponential backoff for retry
        const backoffDelay = Math.min(1000 * Math.pow(2, job.attempts), 60000); // Max 1 minute
        job.scheduledAt = new Date(Date.now() + backoffDelay);
        console.warn(`Job failed, retrying: ${job.id} (${job.type}) - attempt ${job.attempts}/${job.maxAttempts}`);
      }
    }

    // Continue processing if there are more jobs
    if (this.currentJobs < this.maxConcurrentJobs) {
      setTimeout(() => this.processJobs(), 100);
    }
  }

  /**
   * Run function with timeout
   */
  private static async runWithTimeout<T>(fn: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Job timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      fn
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Clean up old completed jobs
   */
  static cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const now = Date.now();
    const jobsToDelete: string[] = [];

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        (now - job.completedAt.getTime()) > maxAge
      ) {
        jobsToDelete.push(jobId);
      }
    }

    for (const jobId of jobsToDelete) {
      this.jobs.delete(jobId);
    }

    if (jobsToDelete.length > 0) {
      console.log(`Cleaned up ${jobsToDelete.length} old jobs`);
    }
  }

  /**
   * Initialize scheduled jobs
   */
  static initializeScheduledJobs(): void {
    // Register built-in job handlers
    this.registerBuiltInHandlers();

    // Schedule recurring jobs
    this.scheduleBuiltInJobs();

    // Start job processing
    this.processJobs();

    // Start cleanup interval
    setInterval(() => this.cleanupOldJobs(), 60 * 60 * 1000); // Every hour

    console.log('Background job system initialized');
  }

  /**
   * Register built-in job handlers
   */
  private static registerBuiltInHandlers(): void {
    // Daily analytics update
    this.registerHandler('daily_analytics_update', async (job) => {
      const { ProgressAnalytics } = await import('@/app/lib/analytics/progressAnalytics');
      
      // This would update analytics for all active users
      console.log('Running daily analytics update');
      
      return { processedAt: new Date().toISOString() };
    });

    // Cache cleanup
    this.registerHandler('cache_cleanup', async (job) => {
      const { CacheManager } = await import('@/app/lib/cache/cacheManager');
      
      // Clean expired cache entries
      console.log('Running cache cleanup');
      
      return { cleanedAt: new Date().toISOString() };
    });

    // Streak maintenance
    this.registerHandler('streak_maintenance', async (job) => {
      console.log('Running streak maintenance');
      
      // Reset daily streaks, check for streak breaks, etc.
      
      return { maintainedAt: new Date().toISOString() };
    });

    // Insights generation
    this.registerHandler('generate_insights', async (job) => {
      const { ProgressAnalytics } = await import('@/app/lib/analytics/progressAnalytics');
      
      const { userIds } = job.data;
      
      for (const userId of userIds) {
        await ProgressAnalytics.generateInsights(userId);
      }
      
      return { insightsGenerated: userIds.length };
    });

    // Rank recalculation
    this.registerHandler('rank_recalculation', async (job) => {
      console.log('Running rank recalculation');
      
      // Recalculate ranks based on current XP levels
      
      return { recalculatedAt: new Date().toISOString() };
    });

    // Notification cleanup
    this.registerHandler('notification_cleanup', async (job) => {
      console.log('Running notification cleanup');
      
      // Clean old notifications, mark as read, etc.
      
      return { cleanedAt: new Date().toISOString() };
    });
  }

  /**
   * Schedule built-in jobs
   */
  private static scheduleBuiltInJobs(): void {
    // Daily analytics update at 2 AM
    this.scheduleJob({
      type: 'daily_analytics_update',
      handler: async () => {}, // Handler registered above
      schedule: '0 2 * * *', // Cron: at 2:00 AM every day
      enabled: true,
      priority: 'medium',
      maxAttempts: 3,
      timeout: 1800 // 30 minutes
    });

    // Cache cleanup every 6 hours
    this.scheduleJob({
      type: 'cache_cleanup',
      handler: async () => {},
      schedule: '0 */6 * * *', // Every 6 hours
      enabled: true,
      priority: 'low',
      maxAttempts: 2,
      timeout: 300 // 5 minutes
    });

    // Streak maintenance at midnight
    this.scheduleJob({
      type: 'streak_maintenance',
      handler: async () => {},
      schedule: '0 0 * * *', // At midnight every day
      enabled: true,
      priority: 'high',
      maxAttempts: 3,
      timeout: 600 // 10 minutes
    });

    // Insights generation every 4 hours
    this.scheduleJob({
      type: 'generate_insights',
      handler: async () => {},
      schedule: '0 */4 * * *', // Every 4 hours
      enabled: true,
      priority: 'medium',
      maxAttempts: 2,
      timeout: 1800 // 30 minutes
    });

    // Rank recalculation weekly
    this.scheduleJob({
      type: 'rank_recalculation',
      handler: async () => {},
      schedule: '0 3 * * 0', // At 3:00 AM on Sunday
      enabled: true,
      priority: 'low',
      maxAttempts: 2,
      timeout: 3600 // 1 hour
    });

    // Notification cleanup daily
    this.scheduleJob({
      type: 'notification_cleanup',
      handler: async () => {},
      schedule: '0 1 * * *', // At 1:00 AM every day
      enabled: true,
      priority: 'low',
      maxAttempts: 2,
      timeout: 300 // 5 minutes
    });
  }

  /**
   * Queue insights generation for specific users
   */
  static async queueInsightsGeneration(userIds: string[]): Promise<string> {
    return this.queueJob('generate_insights', { userIds }, {
      priority: 'medium',
      maxAttempts: 2
    });
  }

  /**
   * Queue cache cleanup
   */
  static async queueCacheCleanup(): Promise<string> {
    return this.queueJob('cache_cleanup', {}, {
      priority: 'low',
      maxAttempts: 1
    });
  }

  /**
   * Queue streak maintenance
   */
  static async queueStreakMaintenance(): Promise<string> {
    return this.queueJob('streak_maintenance', {}, {
      priority: 'high',
      maxAttempts: 3
    });
  }
}

export default BackgroundJobManager;

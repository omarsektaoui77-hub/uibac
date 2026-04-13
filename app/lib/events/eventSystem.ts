// Event-Driven System
// Decoupled event handling for gamification events

export interface GameEvent {
  type: 'LEVEL_UP' | 'RANK_UP' | 'STREAK_MILESTONE' | 'ACHIEVEMENT' | 'XP_EARNED' | 'SUBJECT_MASTERED';
  userId: string;
  data: any;
  timestamp: string;
  metadata?: {
    source?: string;
    sessionId?: string;
    userAgent?: string;
  };
}

export interface EventHandler {
  (event: GameEvent): Promise<void>;
}

export interface EventSubscription {
  id: string;
  eventType: GameEvent['type'];
  handler: EventHandler;
  priority?: number; // Higher priority handlers run first
  filters?: Record<string, any>;
}

/**
 * Event System for Gamification
 * Handles decoupled event processing and notifications
 */
export class EventSystem {
  private static subscriptions = new Map<string, EventSubscription>();
  private static eventQueue: GameEvent[] = [];
  private static isProcessing = false;
  private static maxRetries = 3;
  private static retryDelay = 1000; // ms

  /**
   * Subscribe to events
   */
  static subscribe(
    eventType: GameEvent['type'],
    handler: EventHandler,
    options: {
      id?: string;
      priority?: number;
      filters?: Record<string, any>;
    } = {}
  ): string {
    const id = options.id || `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: EventSubscription = {
      id,
      eventType,
      handler,
      priority: options.priority || 0,
      filters: options.filters
    };

    this.subscriptions.set(id, subscription);
    
    console.log(`Event subscription created: ${id} for ${eventType}`);
    
    return id;
  }

  /**
   * Unsubscribe from events
   */
  static unsubscribe(subscriptionId: string): boolean {
    const deleted = this.subscriptions.delete(subscriptionId);
    
    if (deleted) {
      console.log(`Event subscription removed: ${subscriptionId}`);
    }
    
    return deleted;
  }

  /**
   * Emit an event
   */
  static async emit(eventType: GameEvent['type'], data: Omit<GameEvent, 'type' | 'timestamp'>): Promise<void> {
    const event: GameEvent = {
      type: eventType,
      ...data,
      timestamp: new Date().toISOString()
    };

    // Add to queue for processing
    this.eventQueue.push(event);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processEventQueue();
    }
  }

  /**
   * Process event queue
   */
  private static async processEventQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (!event) continue;
        
        await this.processEvent(event);
      }
    } catch (error) {
      console.error('Error processing event queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event
   */
  private static async processEvent(event: GameEvent, retryCount: number = 0): Promise<void> {
    try {
      // Get relevant subscriptions
      const relevantSubscriptions = Array.from(this.subscriptions.values())
        .filter(sub => sub.eventType === event.type)
        .filter(sub => this.matchesFilters(sub.filters, event))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Execute handlers in priority order
      for (const subscription of relevantSubscriptions) {
        try {
          await subscription.handler(event);
        } catch (error) {
          console.error(`Error in event handler ${subscription.id}:`, error);
          
          // Retry logic for failed handlers
          if (retryCount < this.maxRetries) {
            console.log(`Retrying event handler ${subscription.id} (attempt ${retryCount + 1}/${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
            await this.processEvent(event, retryCount + 1);
          } else {
            console.error(`Event handler ${subscription.id} failed after ${this.maxRetries} retries`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing event:', error);
      
      // Retry the entire event if it's a critical error
      if (retryCount < this.maxRetries) {
        console.log(`Retrying event processing (attempt ${retryCount + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        await this.processEvent(event, retryCount + 1);
      }
    }
  }

  /**
   * Check if event matches subscription filters
   */
  private static matchesFilters(filters: Record<string, any> | undefined, event: GameEvent): boolean {
    if (!filters) return true;
    
    for (const [key, value] of Object.entries(filters)) {
      if (event.data[key] !== value) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get event statistics
   */
  static getStats(): {
    totalSubscriptions: number;
    subscriptionsByType: Record<string, number>;
    queueLength: number;
    isProcessing: boolean;
  } {
    const subscriptionsByType: Record<string, number> = {};
    
    for (const subscription of this.subscriptions.values()) {
      subscriptionsByType[subscription.eventType] = (subscriptionsByType[subscription.eventType] || 0) + 1;
    }
    
    return {
      totalSubscriptions: this.subscriptions.size,
      subscriptionsByType,
      queueLength: this.eventQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clear event queue (for testing/maintenance)
   */
  static clearQueue(): void {
    this.eventQueue.length = 0;
  }

  /**
   * Remove all subscriptions (for testing/maintenance)
   */
  static clearSubscriptions(): void {
    this.subscriptions.clear();
  }
}

// Built-in event handlers
export class GameEventHandlers {
  /**
   * Handle level up events
   */
  static async handleLevelUp(event: GameEvent): Promise<void> {
    const { userId, data } = event;
    
    console.log(`Level up event for user ${userId}: Level ${data.fromLevel} -> ${data.toLevel}`);
    
    // Send notification
    await this.sendNotification(userId, {
      type: 'level_up',
      title: 'Level Up!',
      message: `Congratulations! You've reached level ${data.toLevel}!`,
      data: {
        fromLevel: data.fromLevel,
        toLevel: data.toLevel,
        levelsGained: data.levelsGained
      }
    });
    
    // Log achievement
    await this.logAchievement(userId, {
      type: 'LEVEL_UP',
      data: event.data,
      timestamp: event.timestamp
    });
    
    // Check for rank changes
    if (data.rankChanged) {
      await EventSystem.emit('RANK_UP', {
        userId,
        data: {
          fromRank: data.oldRank,
          toRank: data.newRank
        }
      });
    }
  }

  /**
   * Handle rank up events
   */
  static async handleRankUp(event: GameEvent): Promise<void> {
    const { userId, data } = event;
    
    console.log(`Rank up event for user ${userId}: ${data.fromRank} -> ${data.toRank}`);
    
    // Send notification
    await this.sendNotification(userId, {
      type: 'rank_up',
      title: 'New Rank Achieved!',
      message: `Amazing! You've reached the ${data.toRank} rank!`,
      data: {
        fromRank: data.fromRank,
        toRank: data.toRank
      }
    });
    
    // Unlock new features based on rank
    await this.unlockFeatures(userId, data.toRank);
    
    // Log achievement
    await this.logAchievement(userId, {
      type: 'RANK_UP',
      data: event.data,
      timestamp: event.timestamp
    });
  }

  /**
   * Handle streak milestone events
   */
  static async handleStreakMilestone(event: GameEvent): Promise<void> {
    const { userId, data } = event;
    
    console.log(`Streak milestone for user ${userId}: ${data.streak} days`);
    
    // Send notification
    await this.sendNotification(userId, {
      type: 'streak_milestone',
      title: 'Streak Milestone!',
      message: `Incredible! You've maintained a ${data.streak} day streak!`,
      data: {
        streak: data.streak,
        rewards: data.rewards
      }
    });
    
    // Award streak rewards
    if (data.rewards) {
      await this.awardRewards(userId, data.rewards);
    }
    
    // Log achievement
    await this.logAchievement(userId, {
      type: 'STREAK_MILESTONE',
      data: event.data,
      timestamp: event.timestamp
    });
  }

  /**
   * Handle achievement events
   */
  static async handleAchievement(event: GameEvent): Promise<void> {
    const { userId, data } = event;
    
    console.log(`Achievement unlocked for user ${userId}: ${data.achievementId}`);
    
    // Send notification
    await this.sendNotification(userId, {
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: `Congratulations! You've unlocked ${data.achievementId}!`,
      data: {
        achievementId: data.achievementId,
        description: data.description
      }
    });
    
    // Log achievement
    await this.logAchievement(userId, {
      type: 'ACHIEVEMENT',
      data: event.data,
      timestamp: event.timestamp
    });
  }

  /**
   * Handle XP earned events (for analytics)
   */
  static async handleXPEarned(event: GameEvent): Promise<void> {
    const { userId, data } = event;
    
    // Log for analytics
    await this.logAnalytics(userId, {
      type: 'XP_EARNED',
      data: {
        xpAmount: data.xpAmount,
        subjectId: data.subjectId,
        activityType: data.activityType,
        timestamp: event.timestamp
      }
    });
    
    // Check for XP milestones
    const xpMilestones = [100, 500, 1000, 5000, 10000, 50000, 100000];
    if (xpMilestones.includes(data.totalXP)) {
      await EventSystem.emit('ACHIEVEMENT', {
        userId,
        data: {
          achievementId: `XP_${data.totalXP}`,
          description: `Earned ${data.totalXP} total XP!`
        }
      });
    }
  }

  /**
   * Handle subject mastered events
   */
  static async handleSubjectMastered(event: GameEvent): Promise<void> {
    const { userId, data } = event;
    
    console.log(`Subject mastered by user ${userId}: ${data.subjectId}`);
    
    // Send notification
    await this.sendNotification(userId, {
      type: 'subject_mastered',
      title: 'Subject Mastered!',
      message: `Congratulations! You've mastered ${data.subjectName}!`,
      data: {
        subjectId: data.subjectId,
        subjectName: data.subjectName,
        level: data.level
      }
    });
    
    // Unlock advanced content
    await this.unlockAdvancedContent(userId, data.subjectId);
    
    // Log achievement
    await this.logAchievement(userId, {
      type: 'SUBJECT_MASTERED',
      data: event.data,
      timestamp: event.timestamp
    });
  }

  // Helper methods
  private static async sendNotification(userId: string, notification: any): Promise<void> {
    // In production, this would integrate with a notification service
    console.log(`Notification for user ${userId}:`, notification);
    
    // Store notification in database
    try {
      const { db } = await import('@/app/lib/firebase');
      const { doc, setDoc, Timestamp } = await import('firebase/firestore');
      
      await setDoc(doc(db, 'notifications', `${userId}_${Date.now()}`), {
        userId,
        ...notification,
        createdAt: Timestamp.now(),
        read: false
      });
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  private static async logAchievement(userId: string, achievement: any): Promise<void> {
    try {
      const { db } = await import('@/app/lib/firebase');
      const { doc, setDoc, Timestamp } = await import('firebase/firestore');
      
      await setDoc(doc(db, 'achievements', `${userId}_${Date.now()}`), {
        userId,
        ...achievement,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Failed to log achievement:', error);
    }
  }

  private static async logAnalytics(userId: string, analytics: any): Promise<void> {
    try {
      const { db } = await import('@/app/lib/firebase');
      const { doc, setDoc, Timestamp } = await import('firebase/firestore');
      
      await setDoc(doc(db, 'analytics', `${userId}_${Date.now()}`), {
        userId,
        ...analytics,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Failed to log analytics:', error);
    }
  }

  private static async unlockFeatures(userId: string, rank: string): Promise<void> {
    // Implement feature unlocking logic based on rank
    const featureUnlocks: Record<string, string[]> = {
      'Novice': ['weekly_challenges'],
      'Intermediate': ['advanced_topics', 'study_groups'],
      'Advanced': ['expert_mode', 'tournaments'],
      'Expert': ['mentorship_tools', 'content_creation'],
      'Master': ['teaching_tools', 'custom_content'],
      'Elite': ['vip_events', 'exclusive_content'],
      'Legend': ['hall_of_fame', 'lifetime_benefits']
    };

    const features = featureUnlocks[rank] || [];
    
    for (const feature of features) {
      console.log(`Unlocking feature ${feature} for user ${userId}`);
      // Update user document with unlocked features
    }
  }

  private static async awardRewards(userId: string, rewards: any[]): Promise<void> {
    for (const reward of rewards) {
      console.log(`Awarding reward to user ${userId}:`, reward);
      // Implement reward awarding logic
    }
  }

  private static async unlockAdvancedContent(userId: string, subjectId: string): Promise<void> {
    console.log(`Unlocking advanced content for user ${userId} in subject ${subjectId}`);
    // Implement advanced content unlocking logic
  }
}

// Register default event handlers
export function initializeEventHandlers(): void {
  // Level up handler
  EventSystem.subscribe('LEVEL_UP', GameEventHandlers.handleLevelUp, {
    id: 'level_up_handler',
    priority: 10
  });

  // Rank up handler
  EventSystem.subscribe('RANK_UP', GameEventHandlers.handleRankUp, {
    id: 'rank_up_handler',
    priority: 10
  });

  // Streak milestone handler
  EventSystem.subscribe('STREAK_MILESTONE', GameEventHandlers.handleStreakMilestone, {
    id: 'streak_milestone_handler',
    priority: 10
  });

  // Achievement handler
  EventSystem.subscribe('ACHIEVEMENT', GameEventHandlers.handleAchievement, {
    id: 'achievement_handler',
    priority: 5
  });

  // XP earned handler
  EventSystem.subscribe('XP_EARNED', GameEventHandlers.handleXPEarned, {
    id: 'xp_earned_handler',
    priority: 1
  });

  // Subject mastered handler
  EventSystem.subscribe('SUBJECT_MASTERED', GameEventHandlers.handleSubjectMastered, {
    id: 'subject_mastered_handler',
    priority: 10
  });

  console.log('Event handlers initialized');
}

export default EventSystem;

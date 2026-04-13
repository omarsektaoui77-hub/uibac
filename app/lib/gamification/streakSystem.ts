// Streak System with Daily Tracking Logic
// Handles daily streaks, milestones, and engagement tracking

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // ISO date string
  streakHistory: Array<{
    date: string;
    activities: number;
    xpEarned: number;
    maintained: boolean;
  }>;
  milestones: Array<{
    streak: number;
    achieved: string;
    rewards: string[];
  }>;
  freezeDays: number; // Streak freeze days available
}

export interface StreakUpdateResult {
  success: boolean;
  streakExtended: boolean;
  streakReset: boolean;
  newStreak: number;
  milestone: boolean;
  rewards: string[];
  message: string;
  nextMilestone: number;
}

export interface StreakMilestone {
  streak: number;
  name: string;
  description: string;
  rewards: Array<{
    type: 'xp_bonus' | 'badge' | 'unlock' | 'freeze';
    name: string;
    value: number | string;
    icon: string;
  }>;
  celebration: {
    type: 'fire' | 'ice' | 'golden' | 'rainbow';
    message: string;
    sound: string;
  };
}

/**
 * Comprehensive streak tracking system
 */
export class StreakSystem {
  private static readonly STREAK_MILESTONES: StreakMilestone[] = [
    {
      streak: 3,
      name: 'Hot Start',
      description: '3 days in a row!',
      rewards: [
        { type: 'xp_bonus', name: 'Week Starter', value: 50, icon: 'fire' },
        { type: 'badge', name: '3-Day Streak', value: 'badge_3_day', icon: 'medal' }
      ],
      celebration: {
        type: 'fire',
        message: 'You\'re on fire! 3-day streak achieved!',
        sound: 'streak_3'
      }
    },
    {
      streak: 7,
      name: 'Week Warrior',
      description: 'One full week of learning!',
      rewards: [
        { type: 'xp_bonus', name: 'Weekly Bonus', value: 100, icon: 'calendar' },
        { type: 'freeze', name: 'Streak Freeze', value: 1, icon: 'shield' },
        { type: 'badge', name: 'Week Warrior', value: 'badge_week', icon: 'trophy' }
      ],
      celebration: {
        type: 'golden',
        message: 'Amazing! A full week of consistent learning!',
        sound: 'streak_7'
      }
    },
    {
      streak: 14,
      name: 'Two-Week Champion',
      description: 'Two weeks of dedication!',
      rewards: [
        { type: 'xp_bonus', name: 'Bi-Weekly Bonus', value: 200, icon: 'star' },
        { type: 'freeze', name: 'Double Freeze', value: 2, icon: 'snowflake' },
        { type: 'unlock', name: 'Advanced Challenges', value: 'advanced_challenges', icon: 'lock_open' }
      ],
      celebration: {
        type: 'ice',
        message: 'Incredible consistency! Two weeks achieved!',
        sound: 'streak_14'
      }
    },
    {
      streak: 30,
      name: 'Monthly Master',
      description: '30 days of learning excellence!',
      rewards: [
        { type: 'xp_bonus', name: 'Monthly Master', value: 500, icon: 'crown' },
        { type: 'freeze', name: 'Freeze Pack', value: 3, icon: 'shield' },
        { type: 'badge', name: 'Monthly Master', value: 'badge_month', icon: 'medal_gold' },
        { type: 'unlock', name: 'Exclusive Content', value: 'exclusive_content', icon: 'diamond' }
      ],
      celebration: {
        type: 'rainbow',
        message: 'LEGENDARY! 30-day streak - you\'re a true master!',
        sound: 'streak_30'
      }
    },
    {
      streak: 60,
      name: 'Two-Month Legend',
      description: '60 days of unwavering commitment!',
      rewards: [
        { type: 'xp_bonus', name: 'Legend Bonus', value: 1000, icon: 'legend' },
        { type: 'freeze', name: 'Freeze Mastery', value: 5, icon: 'shield_gold' },
        { type: 'badge', name: 'Two-Month Legend', value: 'badge_60', icon: 'trophy_gold' },
        { type: 'unlock', name: 'Mentor Status', value: 'mentor_status', icon: 'users' }
      ],
      celebration: {
        type: 'rainbow',
        message: 'MYTHICAL! 60 days - you\'re in the hall of fame!',
        sound: 'streak_60'
      }
    },
    {
      streak: 100,
      name: 'Century Streak',
      description: '100 days of pure dedication!',
      rewards: [
        { type: 'xp_bonus', name: 'Century Power', value: 2000, icon: 'star_of_legend' },
        { type: 'freeze', name: 'Unlimited Freezes', value: 10, icon: 'infinity' },
        { type: 'badge', name: 'Century Achievement', value: 'badge_100', icon: 'trophy_legendary' },
        { type: 'unlock', name: 'Hall of Fame', value: 'hall_of_fame', icon: 'monument' }
      ],
      celebration: {
        type: 'rainbow',
        message: 'IMMORTAL! 100-day streak - you\'ve achieved the impossible!',
        sound: 'streak_100'
      }
    }
  ];

  /**
   * Update user streak based on activity
   */
  static async updateStreak(
    user: any, // UserProgress type
    subjectId?: string
  ): Promise<StreakUpdateResult> {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const lastActive = new Date(user.globalStats.lastActive).toISOString().split('T')[0];

    // Check if same day activity
    if (today === lastActive) {
      return {
        success: true,
        streakExtended: false,
        streakReset: false,
        newStreak: user.globalStats.streak,
        milestone: false,
        rewards: [],
        message: 'Continue your streak! Keep going!',
        nextMilestone: this.getNextMilestone(user.globalStats.streak)
      };
    }

    // Check if streak is broken (more than 1 day gap)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = user.globalStats.streak;
    let streakReset = false;
    let streakExtended = false;

    if (lastActive === yesterdayStr) {
      // Continue streak
      newStreak++;
      streakExtended = true;
    } else if (lastActive < yesterdayStr) {
      // Check for streak freeze
      const daysSinceLastActive = Math.floor(
        (now.getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (user.antiCheat?.freezeDays > 0 && daysSinceLastActive <= 2) {
        // Use streak freeze
        newStreak++;
        streakExtended = true;
        user.antiCheat.freezeDays--;
      } else {
        // Reset streak
        newStreak = 1;
        streakReset = true;
      }
    }

    // Check for milestones
    const milestone = this.checkMilestone(newStreak, user.globalStats.streak);
    const rewards = milestone?.rewards.map(r => r.name) || [];

    // Update streak history
    const streakHistory = user.globalStats.streakHistory || [];
    streakHistory.push({
      date: today,
      activities: 1, // Would be calculated from actual activity
      xpEarned: 0, // Would be calculated from actual XP
      maintained: !streakReset
    });

    // Keep only last 30 days of history
    if (streakHistory.length > 30) {
      streakHistory.splice(0, streakHistory.length - 30);
    }

    return {
      success: true,
      streakExtended,
      streakReset,
      newStreak,
      milestone: !!milestone,
      rewards,
      message: this.generateStreakMessage(streakExtended, streakReset, newStreak, milestone),
      nextMilestone: this.getNextMilestone(newStreak)
    };
  }

  /**
   * Check if user achieved a new milestone
   */
  private static checkMilestone(newStreak: number, oldStreak: number): StreakMilestone | null {
    return this.STREAK_MILESTONES.find(milestone => 
      newStreak === milestone.streak && oldStreak < milestone.streak
    ) || null;
  }

  /**
   * Get next milestone
   */
  static getNextMilestone(currentStreak: number): number {
    const nextMilestone = this.STREAK_MILESTONES.find(m => m.streak > currentStreak);
    return nextMilestone?.streak || 0;
  }

  /**
   * Generate appropriate streak message
   */
  private static generateStreakMessage(
    extended: boolean,
    reset: boolean,
    streak: number,
    milestone?: StreakMilestone
  ): string {
    if (milestone) {
      return milestone.celebration.message;
    }

    if (reset) {
      return `Streak reset. Start fresh today! You can do this!`;
    }

    if (extended) {
      const messages = [
        `Great job! ${streak} day streak alive!`,
        `Keep it going! ${streak} days strong!`,
        `Fire! ${streak} days and counting!`,
        `Unstoppable! ${streak} days in a row!`
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }

    return `Welcome back! Let's keep the momentum going!`;
  }

  /**
   * Get streak freeze usage
   */
  static getStreakFreezeInfo(user: any): {
    available: number;
    used: number;
    maxFreeze: number;
    nextFreezeAt: string | null;
  } {
    const maxFreeze = this.getMaxFreezeForRank(user.globalStats.rank);
    const used = maxFreeze - (user.antiCheat?.freezeDays || 0);
    const nextFreezeAt = this.getNextFreezeDate(user);

    return {
      available: user.antiCheat?.freezeDays || 0,
      used,
      maxFreeze,
      nextFreezeAt
    };
  }

  /**
   * Get maximum freeze days based on rank
   */
  private static getMaxFreezeForRank(rank: string): number {
    const freezeLimits: Record<string, number> = {
      'Beginner': 1,
      'Novice': 2,
      'Intermediate': 3,
      'Advanced': 5,
      'Expert': 7,
      'Master': 10,
      'Elite': 15,
      'Legend': 20
    };
    
    return freezeLimits[rank] || 1;
  }

  /**
   * Get next freeze grant date
   */
  private static getNextFreezeDate(user: any): string | null {
    // Grant freeze days monthly based on rank
    const now = new Date();
    const lastLogin = new Date(user.globalStats.lastActive);
    
    // If user hasn't logged in this month, they get freeze days on next login
    if (now.getMonth() !== lastLogin.getMonth() || now.getFullYear() !== lastLogin.getFullYear()) {
      return now.toISOString();
    }
    
    return null;
  }

  /**
   * Calculate streak bonus XP
   */
  static calculateStreakBonus(streak: number, baseXP: number): number {
    if (streak < 3) return 0;
    
    const bonusPercentages = [
      { minStreak: 3, maxStreak: 6, bonus: 0.1 },  // 10% bonus
      { minStreak: 7, maxStreak: 13, bonus: 0.15 }, // 15% bonus
      { minStreak: 14, maxStreak: 29, bonus: 0.2 }, // 20% bonus
      { minStreak: 30, maxStreak: 59, bonus: 0.25 }, // 25% bonus
      { minStreak: 60, maxStreak: 99, bonus: 0.3 },  // 30% bonus
      { minStreak: 100, maxStreak: Infinity, bonus: 0.35 } // 35% bonus
    ];

    const applicableBonus = bonusPercentages.find(
      bonus => streak >= bonus.minStreak && streak <= bonus.maxStreak
    );

    return applicableBonus ? Math.floor(baseXP * applicableBonus.bonus) : 0;
  }

  /**
   * Get streak statistics
   */
  static getStreakStats(user: any): {
    current: number;
    longest: number;
    average: number;
    totalDays: number;
    thisMonth: number;
    bestMonth: string;
    milestones: number;
  } {
    const history = user.globalStats.streakHistory || [];
    const current = user.globalStats.streak;
    const longest = user.globalStats.longestStreak;
    
    const totalDays = history.length;
    const average = totalDays > 0 ? history.reduce((sum: number, day: any) => sum + (day.maintained ? 1 : 0), 0) / totalDays : 0;
    
    // Current month activity
    const now = new Date();
    const thisMonth = history.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate.getMonth() === now.getMonth() && dayDate.getFullYear() === now.getFullYear();
    }).length;
    
    // Best month
    const monthCounts: Record<string, number> = {};
    history.forEach(day => {
      if (day.maintained) {
        const monthKey = day.date.substring(0, 7); // YYYY-MM
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      }
    });
    
    const bestMonth = Object.entries(monthCounts).reduce((best, [month, count]) => 
      count > best.count ? { month, count } : best,
      { month: '', count: 0 }
    ).month;
    
    const milestones = this.STREAK_MILESTONES.filter(m => m.streak <= current).length;

    return {
      current,
      longest,
      average,
      totalDays,
      thisMonth,
      bestMonth,
      milestones
    };
  }

  /**
   * Get streak prediction
   */
  static predictStreak(user: any): {
    currentStreak: number;
    predictedNextMilestone: string;
    daysToMilestone: number;
    confidence: 'high' | 'medium' | 'low';
    recommendations: string[];
  } {
    const currentStreak = user.globalStats.streak;
    const nextMilestone = this.getNextMilestone(currentStreak);
    
    if (nextMilestone === 0) {
      return {
        currentStreak,
        predictedNextMilestone: 'Max milestone achieved!',
        daysToMilestone: 0,
        confidence: 'high',
        recommendations: ['You\'ve achieved all milestones! Keep maintaining your streak!']
      };
    }

    const daysToMilestone = nextMilestone - currentStreak;
    
    // Calculate confidence based on recent activity
    const history = user.globalStats.streakHistory || [];
    const recentActivity = history.slice(-7); // Last 7 days
    const maintainedDays = recentActivity.filter(day => day.maintained).length;
    
    let confidence: 'high' | 'medium' | 'low';
    if (maintainedDays >= 6) confidence = 'high';
    else if (maintainedDays >= 4) confidence = 'medium';
    else confidence = 'low';

    const recommendations = this.generateStreakRecommendations(confidence, daysToMilestone, user);

    return {
      currentStreak,
      predictedNextMilestone: `${nextMilestone}-day streak`,
      daysToMilestone,
      confidence,
      recommendations
    };
  }

  /**
   * Generate streak recommendations
   */
  private static generateStreakRecommendations(
    confidence: 'high' | 'medium' | 'low',
    daysToMilestone: number,
    user: any
  ): string[] {
    const recommendations: string[] = [];

    if (confidence === 'high') {
      recommendations.push('You\'re doing great! Keep up the consistency!');
      if (daysToMilestone <= 3) {
        recommendations.push(`So close! Just ${daysToMilestone} more days to milestone!`);
      }
    } else if (confidence === 'medium') {
      recommendations.push('Try to maintain daily activity for better streak stability');
      recommendations.push('Set a daily reminder to keep your streak alive');
    } else {
      recommendations.push('Focus on building consistent daily habits');
      recommendations.push('Start with smaller goals and gradually increase');
    }

    if (user.antiCheat?.freezeDays > 0) {
      recommendations.push('You have streak freezes available as backup!');
    }

    return recommendations;
  }

  /**
   * Get all available milestones
   */
  static getAllMilestones(): StreakMilestone[] {
    return [...this.STREAK_MILESTONES];
  }

  /**
   * Get milestone by streak number
   */
  static getMilestone(streak: number): StreakMilestone | null {
    return this.STREAK_MILESTONES.find(m => m.streak === streak) || null;
  }

  /**
   * Check if user is at risk of losing streak
   */
  static isStreakAtRisk(user: any): {
    atRisk: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    hoursRemaining: number;
    message: string;
  } {
    const now = new Date();
    const lastActive = new Date(user.globalStats.lastActive);
    const hoursSinceLastActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
    
    let atRisk = false;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let message = '';

    if (hoursSinceLastActive > 24) {
      atRisk = true;
      riskLevel = 'high';
      message = 'Danger! Your streak is at risk of breaking today!';
    } else if (hoursSinceLastActive > 20) {
      atRisk = true;
      riskLevel = 'medium';
      message = 'Warning! Your streak is at risk. Complete an activity soon!';
    } else if (hoursSinceLastActive > 16) {
      atRisk = true;
      riskLevel = 'low';
      message = 'Heads up! Your streak needs attention today.';
    }

    const hoursRemaining = Math.max(0, 48 - hoursSinceLastActive); // 48-hour window

    return {
      atRisk,
      riskLevel,
      hoursRemaining,
      message
    };
  }

  /**
   * Format streak for display
   */
  static formatStreak(streak: number): string {
    if (streak >= 100) {
      return `${streak} days! Legendary!`;
    } else if (streak >= 30) {
      return `${streak} days! Amazing!`;
    } else if (streak >= 7) {
      return `${streak} days! Great!`;
    } else if (streak >= 3) {
      return `${streak} days! Keep going!`;
    }
    return `${streak} day${streak !== 1 ? 's' : ''}`;
  }

  /**
   * Get streak color based on length
   */
  static getStreakColor(streak: number): string {
    if (streak >= 100) return '#FFD700'; // Gold
    if (streak >= 60) return '#FF6B6B';  // Red
    if (streak >= 30) return '#4ECDC4';  // Teal
    if (streak >= 14) return '#457B9D';  // Blue
    if (streak >= 7) return '#95E77E';   // Green
    if (streak >= 3) return '#FFE66D';   // Yellow
    return '#6B7280'; // Gray
  }
}

export default StreakSystem;

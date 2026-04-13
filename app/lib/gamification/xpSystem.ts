// Configurable XP & Level System
// Avoids hardcoded formulas, supports dynamic configuration

export interface XPConfig {
  baseXP: number;          // XP needed for level 1
  growthRate: number;        // Multiplier for each level
  maxLevel: number;         // Maximum level cap
  bonusMultiplier: number;   // Bonus XP for correct answers
  streakBonus: number;       // Bonus XP for streaks
  difficultyMultiplier: Record<string, number>; // XP multipliers by difficulty
}

export interface XPResult {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  xpRemaining: number;
  progressPercentage: number;
  totalXPForCurrentLevel: number;
  hasLeveledUp: boolean;
  levelsGained: number;
}

export interface RankConfig {
  name: string;
  minLevel: number;
  maxLevel: number;
  color: string;
  icon: string;
  description: string;
  perks: string[];
}

/**
 * Configurable XP and Level calculation system
 */
export class XPSystem {
  private static readonly DEFAULT_CONFIG: XPConfig = {
    baseXP: 100,
    growthRate: 1.5,
    maxLevel: 100,
    bonusMultiplier: 1.0,
    streakBonus: 1.5,
    difficultyMultiplier: {
      easy: 0.8,
      medium: 1.0,
      hard: 1.5
    }
  };

  private static readonly RANKS: RankConfig[] = [
    {
      name: 'Beginner',
      minLevel: 1,
      maxLevel: 10,
      color: '#10B981',
      icon: 'seedling',
      description: 'Just starting your journey',
      perks: ['Basic access', 'Daily challenges']
    },
    {
      name: 'Novice',
      minLevel: 11,
      maxLevel: 20,
      color: '#3B82F6',
      icon: 'sprout',
      description: 'Learning the basics',
      perks: ['Advanced access', 'Weekly challenges']
    },
    {
      name: 'Intermediate',
      minLevel: 21,
      maxLevel: 35,
      color: '#8B5CF6',
      icon: 'leaf',
      description: 'Building solid foundations',
      perks: ['Premium features', 'Monthly rewards']
    },
    {
      name: 'Advanced',
      minLevel: 36,
      maxLevel: 50,
      color: '#F59E0B',
      icon: 'tree',
      description: 'Mastering complex concepts',
      perks: ['Expert content', 'Achievement badges']
    },
    {
      name: 'Expert',
      minLevel: 51,
      maxLevel: 70,
      color: '#EF4444',
      icon: 'flame',
      description: 'Deep knowledge and skills',
      perks: ['Mentorship access', 'Special tournaments']
    },
    {
      name: 'Master',
      minLevel: 71,
      maxLevel: 85,
      color: '#DC2626',
      icon: 'star',
      description: 'Exceptional understanding',
      perks: ['Teaching tools', 'Custom content']
    },
    {
      name: 'Elite',
      minLevel: 86,
      maxLevel: 95,
      color: '#7C3AED',
      icon: 'crown',
      description: 'Top-tier achievement',
      perks: ['VIP access', 'Exclusive events']
    },
    {
      name: 'Legend',
      minLevel: 96,
      maxLevel: 100,
      color: '#FFD700',
      icon: 'trophy',
      description: 'Legendary status achieved',
      perks: ['Hall of Fame', 'Lifetime benefits']
    }
  ];

  /**
   * Calculate level from XP using configurable formula
   */
  static getLevelFromXP(xp: number, config: Partial<XPConfig> = {}): number {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    if (xp < finalConfig.baseXP) {
      return 1;
    }

    // Using exponential growth formula: XP = baseXP * (growthRate ^ (level - 1))
    // Solving for level: level = 1 + log(xp / baseXP) / log(growthRate)
    const level = Math.floor(
      1 + Math.log(xp / finalConfig.baseXP) / Math.log(finalConfig.growthRate)
    );

    return Math.min(Math.max(1, level), finalConfig.maxLevel);
  }

  /**
   * Calculate XP required for a specific level
   */
  static getXPForLevel(level: number, config: Partial<XPConfig> = {}): number {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    if (level < 1) return 0;
    if (level > finalConfig.maxLevel) return this.getXPForLevel(finalConfig.maxLevel, config);
    
    // XP = baseXP * (growthRate ^ (level - 1))
    return Math.floor(
      finalConfig.baseXP * Math.pow(finalConfig.growthRate, level - 1)
    );
  }

  /**
   * Calculate XP required for next level
   */
  static getXPForNextLevel(currentLevel: number, config: Partial<XPConfig> = {}): number {
    return this.getXPForLevel(currentLevel + 1, config);
  }

  /**
   * Calculate comprehensive XP result
   */
  static calculateXPResult(currentXP: number, config: Partial<XPConfig> = {}): XPResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    const currentLevel = this.getLevelFromXP(currentXP, config);
    const xpForCurrentLevel = this.getXPForLevel(currentLevel, config);
    const xpForNextLevel = this.getXPForNextLevel(currentLevel, config);
    const xpRemaining = Math.max(0, xpForNextLevel - currentXP);
    const progressPercentage = xpForNextLevel > xpForCurrentLevel 
      ? ((currentXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
      : 100;

    return {
      level: currentLevel,
      currentXP,
      xpForNextLevel,
      xpRemaining,
      progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
      totalXPForCurrentLevel: xpForCurrentLevel,
      hasLeveledUp: false,
      levelsGained: 0
    };
  }

  /**
   * Calculate XP result with level-up detection
   */
  static calculateProgressWithLevelUp(
    currentXP: number, 
    earnedXP: number, 
    config: Partial<XPConfig> = {}
  ): XPResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    const beforeResult = this.calculateXPResult(currentXP, config);
    const newXP = currentXP + earnedXP;
    const afterResult = this.calculateXPResult(newXP, config);
    
    const levelsGained = afterResult.level - beforeResult.level;
    const hasLeveledUp = levelsGained > 0;

    return {
      ...afterResult,
      hasLeveledUp,
      levelsGained
    };
  }

  /**
   * Calculate XP earned from an activity
   */
  static calculateXPEarned(
    baseXP: number,
    difficulty: string,
    isCorrect: boolean,
    streakMultiplier: number = 1,
    config: Partial<XPConfig> = {}
  ): number {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    if (!isCorrect) {
      return 0;
    }

    let xp = baseXP * finalConfig.bonusMultiplier;
    
    // Apply difficulty multiplier
    const difficultyKey = difficulty.toLowerCase();
    if (finalConfig.difficultyMultiplier[difficultyKey]) {
      xp *= finalConfig.difficultyMultiplier[difficultyKey];
    }
    
    // Apply streak bonus
    if (streakMultiplier > 1) {
      xp *= (1 + (finalConfig.streakBonus - 1) * Math.min(streakMultiplier, 3));
    }
    
    return Math.floor(xp);
  }

  /**
   * Get rank information for a level
   */
  static getRankForLevel(level: number): RankConfig | null {
    for (const rank of this.RANKS) {
      if (level >= rank.minLevel && level <= rank.maxLevel) {
        return rank;
      }
    }
    
    return this.RANKS[this.RANKS.length - 1]; // Return highest rank
  }

  /**
   * Get rank progress information
   */
  static getRankProgress(level: number): {
    currentRank: RankConfig | null;
    nextRank: RankConfig | null;
    progressInRank: number;
    progressToNextRank: number;
    percentageToNextRank: number;
  } {
    const currentRank = this.getRankForLevel(level);
    let nextRank = null;
    let progressInRank = 0;
    let progressToNextRank = 0;
    let percentageToNextRank = 0;

    if (currentRank) {
      progressInRank = level - currentRank.minLevel + 1;
      
      // Find next rank
      const currentIndex = this.RANKS.findIndex(r => r.name === currentRank.name);
      if (currentIndex < this.RANKS.length - 1) {
        nextRank = this.RANKS[currentIndex + 1];
        progressToNextRank = nextRank.minLevel - level;
        percentageToNextRank = (progressInRank / (currentRank.maxLevel - currentRank.minLevel + 1)) * 100;
      }
    }

    return {
      currentRank,
      nextRank,
      progressInRank,
      progressToNextRank,
      percentageToNextRank
    };
  }

  /**
   * Calculate XP needed to reach a specific level
   */
  static getXPNeededForLevel(
    currentXP: number, 
    targetLevel: number, 
    config: Partial<XPConfig> = {}
  ): number {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    if (targetLevel <= finalConfig.maxLevel) {
      const xpForTarget = this.getXPForLevel(targetLevel, config);
      return Math.max(0, xpForTarget - currentXP);
    }
    
    return Infinity; // Can't reach beyond max level
  }

  /**
   * Calculate time to next level based on average XP rate
   */
  static estimateTimeToNextLevel(
    currentXP: number, 
    xpPerHour: number, 
    config: Partial<XPConfig> = {}
  ): {
    hours: number;
    days: number;
    weeks: number;
  } {
    const result = this.calculateXPResult(currentXP, config);
    
    if (xpPerHour <= 0 || result.xpRemaining <= 0) {
      return { hours: 0, days: 0, weeks: 0 };
    }
    
    const hours = result.xpRemaining / xpPerHour;
    const days = hours / 24;
    const weeks = days / 7;
    
    return {
      hours: Math.ceil(hours),
      days: Math.ceil(days),
      weeks: Math.ceil(weeks)
    };
  }

  /**
   * Validate XP configuration
   */
  static validateConfig(config: Partial<XPConfig>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (config.baseXP !== undefined && config.baseXP <= 0) {
      errors.push('baseXP must be positive');
    }
    
    if (config.growthRate !== undefined && config.growthRate <= 1) {
      errors.push('growthRate must be greater than 1');
    }
    
    if (config.maxLevel !== undefined && config.maxLevel <= 1) {
      errors.push('maxLevel must be greater than 1');
    }
    
    if (config.bonusMultiplier !== undefined && config.bonusMultiplier <= 0) {
      errors.push('bonusMultiplier must be positive');
    }
    
    if (config.streakBonus !== undefined && config.streakBonus <= 1) {
      errors.push('streakBonus must be greater than 1');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all available ranks
   */
  static getAllRanks(): RankConfig[] {
    return [...this.RANKS];
  }

  /**
   * Get rank by name
   */
  static getRankByName(name: string): RankConfig | null {
    return this.RANKS.find(rank => rank.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Calculate level-up rewards
   */
  static getLevelUpRewards(level: number): {
    xpBonus: number;
    unlocks: string[];
    achievements: string[];
  } {
    const rewards = {
      xpBonus: Math.floor(level * 10), // 10 XP per level as bonus
      unlocks: [] as string[],
      achievements: [] as string[]
    };

    // Milestone unlocks
    if (level === 5) {
      rewards.unlocks.push('Advanced Topics');
      rewards.achievements.push('First Steps');
    }
    
    if (level === 10) {
      rewards.unlocks.push('Weekly Challenges');
      rewards.achievements.push('Dedicated Learner');
    }
    
    if (level === 25) {
      rewards.unlocks.push('Expert Mode');
      rewards.achievements.push('Knowledge Master');
    }
    
    if (level === 50) {
      rewards.unlocks.push('Mentorship Program');
      rewards.achievements.push('Elite Status');
    }
    
    if (level === 100) {
      rewards.unlocks.push('Hall of Fame');
      rewards.achievements.push('Legendary Achievement');
    }

    return rewards;
  }

  /**
   * Format XP for display
   */
  static formatXP(xp: number): string {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M XP`;
    } else if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K XP`;
    }
    
    return `${Math.floor(xp)} XP`;
  }

  /**
   * Get level color based on rank
   */
  static getLevelColor(level: number): string {
    const rank = this.getRankForLevel(level);
    return rank?.color || '#6B7280';
  }
}

export default XPSystem;

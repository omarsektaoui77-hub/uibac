// Dynamic Rank System
// Handles rank progression, perks, and visual representation

import { RankConfig } from './xpSystem';

export interface RankProgress {
  currentRank: RankConfig;
  nextRank: RankConfig | null;
  progressInRank: number;
  progressToNextRank: number;
  percentageToNextRank: number;
  rankColor: string;
  rankIcon: string;
}

export interface RankReward {
  type: 'xp_bonus' | 'unlock' | 'badge' | 'privilege';
  name: string;
  description: string;
  value: number | string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface RankMilestone {
  level: number;
  rank: string;
  rewards: RankReward[];
  celebration: {
    type: 'confetti' | 'fireworks' | 'spotlight' | 'royal';
    message: string;
    sound: string;
  };
}

/**
 * Dynamic rank system with comprehensive progression tracking
 */
export class RankSystem {
  private static readonly RANK_MILESTONES: RankMilestone[] = [
    {
      level: 1,
      rank: 'Beginner',
      rewards: [
        {
          type: 'unlock',
          name: 'Basic Access',
          description: 'Access to all beginner content',
          value: 'basic_content',
          icon: 'unlock',
          rarity: 'common'
        },
        {
          type: 'badge',
          name: 'First Steps',
          description: 'Started your learning journey',
          value: 'badge_first_steps',
          icon: 'medal',
          rarity: 'common'
        }
      ],
      celebration: {
        type: 'confetti',
        message: 'Welcome to your learning journey! You\'ve taken your first step.',
        sound: 'level_up_basic'
      }
    },
    {
      level: 10,
      rank: 'Novice',
      rewards: [
        {
          type: 'xp_bonus',
          name: 'Novice Bonus',
          description: '+10% XP for all activities',
          value: 10,
          icon: 'star',
          rarity: 'common'
        },
        {
          type: 'unlock',
          name: 'Weekly Challenges',
          description: 'Access to weekly challenge events',
          value: 'weekly_challenges',
          icon: 'calendar',
          rarity: 'rare'
        }
      ],
      celebration: {
        type: 'spotlight',
        message: 'You\'ve become a Novice! Weekly challenges are now unlocked.',
        sound: 'level_up_novice'
      }
    },
    {
      level: 25,
      rank: 'Intermediate',
      rewards: [
        {
          type: 'xp_bonus',
          name: 'Intermediate Boost',
          description: '+15% XP for all activities',
          value: 15,
          icon: 'rocket',
          rarity: 'rare'
        },
        {
          type: 'unlock',
          name: 'Advanced Topics',
          description: 'Access to advanced learning materials',
          value: 'advanced_topics',
          icon: 'book_open',
          rarity: 'rare'
        },
        {
          type: 'privilege',
          name: 'Priority Support',
          description: 'Get priority help from tutors',
          value: 'priority_support',
          icon: 'headset',
          rarity: 'epic'
        }
      ],
      celebration: {
        type: 'fireworks',
        message: 'Amazing progress! You\'ve reached Intermediate level with advanced privileges!',
        sound: 'level_up_intermediate'
      }
    },
    {
      level: 50,
      rank: 'Advanced',
      rewards: [
        {
          type: 'xp_bonus',
          name: 'Advanced Mastery',
          description: '+25% XP for all activities',
          value: 25,
          icon: 'crown',
          rarity: 'epic'
        },
        {
          type: 'unlock',
          name: 'Expert Mode',
          description: 'Access to expert-level challenges',
          value: 'expert_mode',
          icon: 'brain',
          rarity: 'epic'
        },
        {
          type: 'badge',
          name: 'Knowledge Master',
          description: 'Mastered fundamental concepts',
          value: 'badge_knowledge_master',
          icon: 'trophy',
          rarity: 'epic'
        }
      ],
      celebration: {
        type: 'royal',
        message: 'Incredible achievement! You\'ve reached Advanced level with exclusive rewards!',
        sound: 'level_up_advanced'
      }
    },
    {
      level: 75,
      rank: 'Expert',
      rewards: [
        {
          type: 'xp_bonus',
          name: 'Expert Wisdom',
          description: '+35% XP for all activities',
          value: 35,
          icon: 'diamond',
          rarity: 'legendary'
        },
        {
          type: 'unlock',
          name: 'Mentorship Program',
          description: 'Help and mentor other students',
          value: 'mentorship_program',
          icon: 'users',
          rarity: 'legendary'
        },
        {
          type: 'privilege',
          name: 'Content Creator',
          description: 'Create and share your own content',
          value: 'content_creator',
          icon: 'pen_tool',
          rarity: 'legendary'
        }
      ],
      celebration: {
        type: 'royal',
        message: 'Legendary status! You\'re now an Expert with mentorship privileges!',
        sound: 'level_up_expert'
      }
    },
    {
      level: 100,
      rank: 'Legend',
      rewards: [
        {
          type: 'xp_bonus',
          name: 'Legendary Power',
          description: '+50% XP for all activities',
          value: 50,
          icon: 'legend',
          rarity: 'legendary'
        },
        {
          type: 'unlock',
          name: 'Hall of Fame',
          description: 'Permanent place in Hall of Fame',
          value: 'hall_of_fame',
          icon: 'monument',
          rarity: 'legendary'
        },
        {
          type: 'privilege',
          name: 'Lifetime Benefits',
          description: 'All premium features forever',
          value: 'lifetime_benefits',
          icon: 'infinity',
          rarity: 'legendary'
        },
        {
          type: 'badge',
          name: 'Legendary Achievement',
          description: 'Ultimate learning mastery',
          value: 'badge_legendary',
          icon: 'star_of_legend',
          rarity: 'legendary'
        }
      ],
      celebration: {
        type: 'royal',
        message: 'LEGENDARY! You\'ve reached the pinnacle of learning excellence!',
        sound: 'level_up_legendary'
      }
    }
  ];

  /**
   * Get rank information for a given level
   */
  static getRank(level: number): RankConfig {
    const ranks = [
      { name: 'Beginner', minLevel: 1, maxLevel: 10, color: '#10B981', icon: 'seedling', description: 'Just starting your journey', perks: ['Basic access', 'Daily challenges'] },
      { name: 'Novice', minLevel: 11, maxLevel: 20, color: '#3B82F6', icon: 'sprout', description: 'Learning the basics', perks: ['Advanced access', 'Weekly challenges'] },
      { name: 'Intermediate', minLevel: 21, maxLevel: 35, color: '#8B5CF6', icon: 'leaf', description: 'Building solid foundations', perks: ['Premium features', 'Monthly rewards'] },
      { name: 'Advanced', minLevel: 36, maxLevel: 50, color: '#F59E0B', icon: 'tree', description: 'Mastering complex concepts', perks: ['Expert content', 'Achievement badges'] },
      { name: 'Expert', minLevel: 51, maxLevel: 70, color: '#EF4444', icon: 'flame', description: 'Deep knowledge and skills', perks: ['Mentorship access', 'Special tournaments'] },
      { name: 'Master', minLevel: 71, maxLevel: 85, color: '#DC2626', icon: 'star', description: 'Exceptional understanding', perks: ['Teaching tools', 'Custom content'] },
      { name: 'Elite', minLevel: 86, maxLevel: 95, color: '#7C3AED', icon: 'crown', description: 'Top-tier achievement', perks: ['VIP access', 'Exclusive events'] },
      { name: 'Legend', minLevel: 96, maxLevel: 100, color: '#FFD700', icon: 'trophy', description: 'Legendary status achieved', perks: ['Hall of Fame', 'Lifetime benefits'] }
    ];

    return ranks.find(rank => level >= rank.minLevel && level <= rank.maxLevel) || ranks[0];
  }

  /**
   * Get comprehensive rank progress
   */
  static getRankProgress(level: number): RankProgress {
    const currentRank = this.getRank(level);
    const ranks = [
      { name: 'Beginner', minLevel: 1, maxLevel: 10, color: '#10B981', icon: 'seedling', description: 'Just starting your journey', perks: ['Basic access', 'Daily challenges'] },
      { name: 'Novice', minLevel: 11, maxLevel: 20, color: '#3B82F6', icon: 'sprout', description: 'Learning the basics', perks: ['Advanced access', 'Weekly challenges'] },
      { name: 'Intermediate', minLevel: 21, maxLevel: 35, color: '#8B5CF6', icon: 'leaf', description: 'Building solid foundations', perks: ['Premium features', 'Monthly rewards'] },
      { name: 'Advanced', minLevel: 36, maxLevel: 50, color: '#F59E0B', icon: 'tree', description: 'Mastering complex concepts', perks: ['Expert content', 'Achievement badges'] },
      { name: 'Expert', minLevel: 51, maxLevel: 70, color: '#EF4444', icon: 'flame', description: 'Deep knowledge and skills', perks: ['Mentorship access', 'Special tournaments'] },
      { name: 'Master', minLevel: 71, maxLevel: 85, color: '#DC2626', icon: 'star', description: 'Exceptional understanding', perks: ['Teaching tools', 'Custom content'] },
      { name: 'Elite', minLevel: 86, maxLevel: 95, color: '#7C3AED', icon: 'crown', description: 'Top-tier achievement', perks: ['VIP access', 'Exclusive events'] },
      { name: 'Legend', minLevel: 96, maxLevel: 100, color: '#FFD700', icon: 'trophy', description: 'Legendary status achieved', perks: ['Hall of Fame', 'Lifetime benefits'] }
    ];
    
    const currentIndex = ranks.findIndex(rank => rank.name === currentRank.name);
    const nextRank = currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : null;

    const progressInRank = level - currentRank.minLevel + 1;
    const totalLevelsInRank = currentRank.maxLevel - currentRank.minLevel + 1;
    const percentageToNextRank = nextRank 
      ? ((level - currentRank.minLevel) / (nextRank.minLevel - currentRank.minLevel)) * 100
      : 100;

    return {
      currentRank,
      nextRank,
      progressInRank,
      progressToNextRank: nextRank ? nextRank.minLevel - level : 0,
      percentageToNextRank,
      rankColor: currentRank.color,
      rankIcon: currentRank.icon
    };
  }

  /**
   * Check if user leveled up to a new rank
   */
  static checkRankUp(oldLevel: number, newLevel: number): {
    rankUp: boolean;
    oldRank: RankConfig;
    newRank: RankConfig;
    milestone?: RankMilestone;
  } {
    const oldRank = this.getRank(oldLevel);
    const newRank = this.getRank(newLevel);
    const rankUp = oldRank.name !== newRank.name;

    const milestone = rankUp ? this.RANK_MILESTONES.find(m => m.level === newLevel) : undefined;

    return {
      rankUp,
      oldRank,
      newRank,
      milestone
    };
  }

  /**
   * Get rank requirements and benefits
   */
  static getRankInfo(rankName: string): {
    rank: RankConfig;
    requirements: string[];
    benefits: string[];
    nextMilestone?: { level: number; name: string };
  } {
    const rank = this.getRank(1); // Get rank by name would need lookup
    const ranks = [
      { name: 'Beginner', minLevel: 1, maxLevel: 10, color: '#10B981', icon: 'seedling', description: 'Just starting your journey', perks: ['Basic access', 'Daily challenges'] },
      { name: 'Novice', minLevel: 11, maxLevel: 20, color: '#3B82F6', icon: 'sprout', description: 'Learning the basics', perks: ['Advanced access', 'Weekly challenges'] },
      { name: 'Intermediate', minLevel: 21, maxLevel: 35, color: '#8B5CF6', icon: 'leaf', description: 'Building solid foundations', perks: ['Premium features', 'Monthly rewards'] },
      { name: 'Advanced', minLevel: 36, maxLevel: 50, color: '#F59E0B', icon: 'tree', description: 'Mastering complex concepts', perks: ['Expert content', 'Achievement badges'] },
      { name: 'Expert', minLevel: 51, maxLevel: 70, color: '#EF4444', icon: 'flame', description: 'Deep knowledge and skills', perks: ['Mentorship access', 'Special tournaments'] },
      { name: 'Master', minLevel: 71, maxLevel: 85, color: '#DC2626', icon: 'star', description: 'Exceptional understanding', perks: ['Teaching tools', 'Custom content'] },
      { name: 'Elite', minLevel: 86, maxLevel: 95, color: '#7C3AED', icon: 'crown', description: 'Top-tier achievement', perks: ['VIP access', 'Exclusive events'] },
      { name: 'Legend', minLevel: 96, maxLevel: 100, color: '#FFD700', icon: 'trophy', description: 'Legendary status achieved', perks: ['Hall of Fame', 'Lifetime benefits'] }
    ];
    
    const targetRank = ranks.find(r => r.name === rankName) || ranks[0];
    const currentIndex = ranks.findIndex(r => r.name === rankName);
    const nextMilestone = currentIndex < ranks.length - 1 
      ? { level: ranks[currentIndex + 1].minLevel, name: ranks[currentIndex + 1].name }
      : undefined;

    return {
      rank: targetRank,
      requirements: [
        `Reach level ${targetRank.minLevel}`,
        `Complete ${targetRank.minLevel * 10} activities`,
        `Maintain ${Math.floor(targetRank.minLevel / 2)} day streak`
      ],
      benefits: targetRank.perks,
      nextMilestone
    };
  }

  /**
   * Get all available ranks for display
   */
  static getAllRanks(): RankConfig[] {
    return [
      { name: 'Beginner', minLevel: 1, maxLevel: 10, color: '#10B981', icon: 'seedling', description: 'Just starting your journey', perks: ['Basic access', 'Daily challenges'] },
      { name: 'Novice', minLevel: 11, maxLevel: 20, color: '#3B82F6', icon: 'sprout', description: 'Learning the basics', perks: ['Advanced access', 'Weekly challenges'] },
      { name: 'Intermediate', minLevel: 21, maxLevel: 35, color: '#8B5CF6', icon: 'leaf', description: 'Building solid foundations', perks: ['Premium features', 'Monthly rewards'] },
      { name: 'Advanced', minLevel: 36, maxLevel: 50, color: '#F59E0B', icon: 'tree', description: 'Mastering complex concepts', perks: ['Expert content', 'Achievement badges'] },
      { name: 'Expert', minLevel: 51, maxLevel: 70, color: '#EF4444', icon: 'flame', description: 'Deep knowledge and skills', perks: ['Mentorship access', 'Special tournaments'] },
      { name: 'Master', minLevel: 71, maxLevel: 85, color: '#DC2626', icon: 'star', description: 'Exceptional understanding', perks: ['Teaching tools', 'Custom content'] },
      { name: 'Elite', minLevel: 86, maxLevel: 95, color: '#7C3AED', icon: 'crown', description: 'Top-tier achievement', perks: ['VIP access', 'Exclusive events'] },
      { name: 'Legend', minLevel: 96, maxLevel: 100, color: '#FFD700', icon: 'trophy', description: 'Legendary status achieved', perks: ['Hall of Fame', 'Lifetime benefits'] }
    ];
  }

  /**
   * Get rank comparison between users
   */
  static compareRanks(userLevel: number, otherUserLevel: number): {
    userRank: RankConfig;
    otherRank: RankConfig;
    difference: number;
    relationship: 'higher' | 'equal' | 'lower';
  } {
    const userRank = this.getRank(userLevel);
    const otherRank = this.getRank(otherUserLevel);
    
    const userRankIndex = this.getAllRanks().findIndex(r => r.name === userRank.name);
    const otherRankIndex = this.getAllRanks().findIndex(r => r.name === otherRank.name);
    
    const difference = userRankIndex - otherRankIndex;
    
    return {
      userRank,
      otherRank,
      difference,
      relationship: difference > 0 ? 'higher' : difference < 0 ? 'lower' : 'equal'
    };
  }

  /**
   * Get rank-based XP multiplier
   */
  static getRankXPMultiplier(rankName: string): number {
    const multipliers: Record<string, number> = {
      'Beginner': 1.0,
      'Novice': 1.1,
      'Intermediate': 1.25,
      'Advanced': 1.5,
      'Expert': 1.75,
      'Master': 2.0,
      'Elite': 2.25,
      'Legend': 2.5
    };
    
    return multipliers[rankName] || 1.0;
  }

  /**
   * Get rank-based unlock content
   */
  static getRankUnlocks(rankName: string): string[] {
    const unlocks: Record<string, string[]> = {
      'Beginner': ['basic_lessons', 'daily_quizzes'],
      'Novice': ['weekly_challenges', 'leaderboard_access'],
      'Intermediate': ['advanced_topics', 'study_groups'],
      'Advanced': ['expert_mode', 'tutorials'],
      'Expert': ['mentorship_tools', 'content_creation'],
      'Master': ['teaching_tools', 'custom_content'],
      'Elite': ['vip_events', 'exclusive_content'],
      'Legend': ['hall_of_fame', 'lifetime_benefits']
    };
    
    return unlocks[rankName] || [];
  }

  /**
   * Format rank name for display
   */
  static formatRankName(rankName: string): string {
    return rankName.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Get rank color gradient for UI
   */
  static getRankGradient(rankName: string): string {
    const gradients: Record<string, string> = {
      'Beginner': 'linear-gradient(135deg, #10B981, #059669)',
      'Novice': 'linear-gradient(135deg, #3B82F6, #2563EB)',
      'Intermediate': 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
      'Advanced': 'linear-gradient(135deg, #F59E0B, #D97706)',
      'Expert': 'linear-gradient(135deg, #EF4444, #DC2626)',
      'Master': 'linear-gradient(135deg, #DC2626, #B91C1C)',
      'Elite': 'linear-gradient(135deg, #7C3AED, #6D28D9)',
      'Legend': 'linear-gradient(135deg, #FFD700, #F59E0B)'
    };
    
    return gradients[rankName] || gradients['Beginner'];
  }

  /**
   * Get rank statistics for leaderboard
   */
  static getRankStats(users: Array<{ level: number; rank: string }>): {
    totalUsers: number;
    rankDistribution: Record<string, number>;
    averageLevel: number;
    topRank: string;
  } {
    const rankDistribution: Record<string, number> = {};
    let totalLevel = 0;

    for (const user of users) {
      rankDistribution[user.rank] = (rankDistribution[user.rank] || 0) + 1;
      totalLevel += user.level;
    }

    const sortedRanks = Object.entries(rankDistribution).sort(([,a], [,b]) => b - a);
    const topRank = sortedRanks[0]?.[0] || 'Beginner';

    return {
      totalUsers: users.length,
      rankDistribution,
      averageLevel: users.length > 0 ? totalLevel / users.length : 0,
      topRank
    };
  }
}

export default RankSystem;

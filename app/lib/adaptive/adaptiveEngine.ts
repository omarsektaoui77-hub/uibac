/**
 * Adaptive Engine
 * 
 * Safe logic for dynamic difficulty adjustment
 * based on recent user performance.
 */

export class AdaptiveEngine {
  /**
   * Adjust difficulty based on recent results
   * 
   * @param current - Current difficulty level
   * @param recentResults - Boolean array of recent answer correctness
   * @returns Recommended difficulty level
   */
  static adjustDifficulty(
    current: 'easy' | 'medium' | 'hard',
    recentResults: boolean[]
  ): 'easy' | 'medium' | 'hard' {
    // Look at last 3 results
    const last3 = recentResults.slice(-3);

    // Not enough data - stay current
    if (last3.length < 3) {
      return current;
    }

    const successCount = last3.filter(Boolean).length;

    // All failed -> easier
    if (successCount === 0) return 'easy';

    // All correct -> harder
    if (successCount === 3) return 'hard';

    // Mixed results -> medium
    return 'medium';
  }

  /**
   * Get recommended difficulty for a new user
   */
  static getDefaultDifficulty(): 'medium' {
    return 'medium';
  }
}

export class PasswordValidator {
  /**
   * Validate password strength
   * @param password - Password to validate
   * @returns Object with valid flag and array of error messages
   */
  static validate(password: string): { valid: boolean; errors: string[]; strength: 'weak' | 'medium' | 'strong' } {
    const errors: string[] = [];

    // Length check
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Special character check
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Common passwords check
    const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'admin', 'welcome'];
    if (commonPasswords.some(pw => password.toLowerCase().includes(pw))) {
      errors.push('Password is too common');
    }

    // Calculate strength
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    const score = this.calculateScore(password);
    if (score >= 4) strength = 'strong';
    else if (score >= 2) strength = 'medium';

    return {
      valid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Calculate password strength score (0-5)
   */
  private static calculateScore(password: string): number {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    return Math.min(score, 5);
  }

  /**
   * Get password requirements as user-friendly text
   */
  static getRequirements(): string[] {
    return [
      'At least 8 characters',
      'At least one uppercase letter',
      'At least one lowercase letter',
      'At least one number',
      'At least one special character'
    ];
  }
}

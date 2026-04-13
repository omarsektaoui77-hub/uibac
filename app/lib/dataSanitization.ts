// Production-Grade Data Sanitization for PDF Text Processing
// Handles Arabic characters, mathematical symbols, and removes noise

export interface SanitizationResult {
  cleanedText: string;
  originalLength: number;
  cleanedLength: number;
  noiseRemoved: number;
  encodingIssues: string[];
  statistics: {
    arabicChars: number;
    mathSymbols: number;
    words: number;
    sentences: number;
  };
}

/**
 * Advanced PDF text sanitization for production use
 */
export class DataSanitization {
  private static readonly ARABIC_UNICODE_RANGE = /[\u0600-\u06FF]/g;
  private static readonly MATH_SYMBOLS = /[+\-×÷=<>±²³¹]/g;
  private static readonly ARABIC_DIACRITICS = /[\u064B-\u065F]/g;
  private static readonly CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
  
  // Common PDF noise patterns
  private static readonly NOISE_PATTERNS = [
    // Headers and footers
    /^\s*Page\s+\d+\s*$/gm,
    /^\s*\d+\s*$/gm,
    /^\s*©.*$/gm,
    /^\s*Confidential.*$/gm,
    
    // Repeated whitespace
    /\s{3,}/g,
    /\n{3,}/g,
    /\t+/g,
    
    // Common PDF artifacts
    /\f/g, // Form feed
    /\x0C/g, // Another form feed
    /^\s*-\s*$/gm, // Hyphen lines
    
    // Table artifacts
    /^\s*\|\s*$/gm,
    /^\s*_+\s*$/gm,
    
    // Email and web artifacts
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    /https?:\/\/[^\s]+/g,
    
    // Page numbers in various formats
    /^\s*\d+\s*of\s*\d+\s*$/gm,
    /^\s*Fig\.\s*\d+/gm,
    /^\s*Table\s*\d+/gm
  ];

  /**
   * Main sanitization method
   */
  static sanitizePDFText(rawText: string): SanitizationResult {
    const originalLength = rawText.length;
    const encodingIssues: string[] = [];
    
    let cleanedText = rawText;
    
    // Step 1: Encoding normalization
    cleanedText = this.normalizeEncoding(cleanedText, encodingIssues);
    
    // Step 2: Remove control characters and artifacts
    cleanedText = this.removeControlCharacters(cleanedText);
    
    // Step 3: Remove PDF-specific noise
    cleanedText = this.removePDFNoise(cleanedText);
    
    // Step 4: Normalize whitespace
    cleanedText = this.normalizeWhitespace(cleanedText);
    
    // Step 5: Preserve important characters while cleaning
    cleanedText = this.preserveImportantCharacters(cleanedText);
    
    // Step 6: Final cleanup
    cleanedText = this.finalCleanup(cleanedText);
    
    const cleanedLength = cleanedText.length;
    const noiseRemoved = originalLength - cleanedLength;
    
    // Calculate statistics
    const statistics = this.calculateStatistics(cleanedText);
    
    return {
      cleanedText,
      originalLength,
      cleanedLength,
      noiseRemoved,
      encodingIssues,
      statistics
    };
  }

  /**
   * Normalize text encoding and detect issues
   */
  private static normalizeEncoding(text: string, issues: string[]): string {
    let normalized = text;
    
    // Fix common encoding issues
    const encodingFixes = [
      { pattern: /\u00A0/g, replacement: ' ', issue: 'Non-breaking space' },
      { pattern: /\u2013/g, replacement: '-', issue: 'En dash' },
      { pattern: /\u2014/g, replacement: '--', issue: 'Em dash' },
      { pattern: /\u2018/g, replacement: "'", issue: 'Left single quote' },
      { pattern: /\u2019/g, replacement: "'", issue: 'Right single quote' },
      { pattern: /\u201C/g, replacement: '"', issue: 'Left double quote' },
      { pattern: /\u201D/g, replacement: '"', issue: 'Right double quote' },
      { pattern: /\u2026/g, replacement: '...', issue: 'Ellipsis' },
      { pattern: /\u00A9/g, replacement: '(c)', issue: 'Copyright symbol' }
    ];
    
    for (const fix of encodingFixes) {
      if (fix.pattern.test(normalized)) {
        normalized = normalized.replace(fix.pattern, fix.replacement);
        issues.push(fix.issue);
      }
    }
    
    // Handle mixed encoding scenarios
    if (/[\x80-\xFF]/.test(normalized)) {
      // Try to detect and fix common mixed encoding issues
      normalized = normalized
        .replace(/\x80/g, 'â')
        .replace(/\x82/g, 'é')
        .replace(/\x84/g, 'ä')
        .replace(/\x85/g, '...')
        .replace(/\x88/g, 'Ë')
        .replace(/\x89/g, 'ë')
        .replace(/\x8A/g, 'è')
        .replace(/\x8B/g, 'ï')
        .replace(/\x8C/g, 'î')
        .replace(/\x93/g, '"')
        .replace(/\x94/g, '"')
        .replace(/\x96/g, 'ö')
        .replace(/\x97/g, 'ï')
        .replace(/\x99/g, 'TM')
        .replace(/\x9B/g, 'û')
        .replace(/\x9C/g, 'ü');
      
      issues.push('Mixed encoding detected and normalized');
    }
    
    return normalized;
  }

  /**
   * Remove control characters while preserving important ones
   */
  private static removeControlCharacters(text: string): string {
    // Remove most control characters but keep important ones
    return text
      .replace(this.CONTROL_CHARS, '') // Remove control chars
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
      .replace(/[\uFFF0-\uFFFF]/g, ''); // Remove special chars
  }

  /**
   * Remove PDF-specific noise patterns
   */
  private static removePDFNoise(text: string): string {
    let cleaned = text;
    
    for (const pattern of this.NOISE_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Remove excessive punctuation
    cleaned = cleaned.replace(/[.,;:!?]{3,}/g, '...');
    
    // Remove bullet points and numbering artifacts
    cleaned = cleaned.replace(/^\s*[·\u2022\u2023\u25E6]\s*/gm, '');
    cleaned = cleaned.replace(/^\s*[a-zA-Z]\.\s*/gm, '');
    
    return cleaned;
  }

  /**
   * Normalize whitespace intelligently
   */
  private static normalizeWhitespace(text: string): string {
    return text
      // Replace multiple spaces with single space
      .replace(/ {2,}/g, ' ')
      // Replace multiple newlines with single newline, but preserve paragraph breaks
      .replace(/\n{3,}/g, '\n\n')
      // Replace tabs with spaces
      .replace(/\t/g, ' ')
      // Remove leading/trailing whitespace from lines
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0) // Remove empty lines
      .join('\n');
  }

  /**
   * Preserve important characters while cleaning
   */
  private static preserveImportantCharacters(text: string): string {
    // Ensure Arabic characters are preserved
    const arabicChars = text.match(this.ARABIC_UNICODE_RANGE);
    if (arabicChars) {
      // Arabic text is preserved as-is
    }
    
    // Ensure mathematical symbols are preserved
    const mathSymbols = text.match(this.MATH_SYMBOLS);
    if (mathSymbols) {
      // Math symbols are preserved as-is
    }
    
    // Remove diacritics for Arabic (optional, for better processing)
    const textWithoutDiacritics = text.replace(this.ARABIC_DIACRITICS, '');
    
    return textWithoutDiacritics;
  }

  /**
   * Final cleanup and validation
   */
  private static finalCleanup(text: string): string {
    return text
      // Remove any remaining artifacts at line starts/ends
      .split('\n')
      .map(line => line.replace(/^[\s\-_]+|[\s\-_]+$/g, ''))
      .filter(line => line.trim().length > 0)
      .join('\n')
      // Ensure text doesn't end with excessive whitespace
      .trim();
  }

  /**
   * Calculate text statistics
   */
  private static calculateStatistics(text: string): SanitizationResult['statistics'] {
    const arabicChars = (text.match(this.ARABIC_UNICODE_RANGE) || []).length;
    const mathSymbols = (text.match(this.MATH_SYMBOLS) || []).length;
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
    
    return {
      arabicChars,
      mathSymbols,
      words,
      sentences
    };
  }

  /**
   * Quick sanitization for performance-critical scenarios
   */
  static quickSanitize(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(this.CONTROL_CHARS, '')
      .trim();
  }

  /**
   * Validate if text is properly sanitized
   */
  static validateSanitization(result: SanitizationResult): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check for remaining control characters
    if (this.CONTROL_CHARS.test(result.cleanedText)) {
      issues.push('Control characters still present');
    }
    
    // Check for excessive whitespace
    if (/\s{5,}/.test(result.cleanedText)) {
      issues.push('Excessive whitespace detected');
    }
    
    // Check for PDF artifacts
    if (/Page\s+\d+/.test(result.cleanedText)) {
      issues.push('Page number artifacts detected');
    }
    
    // Check minimum content quality
    if (result.statistics.words < 10) {
      issues.push('Insufficient word count');
    }
    
    if (result.statistics.sentences < 2) {
      issues.push('Insufficient sentence count');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Extract meaningful content from sanitized text
   */
  static extractContent(text: string, maxLength: number = 2000): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Take sentences until we reach the desired length
    let content = '';
    for (const sentence of sentences) {
      if (content.length + sentence.length > maxLength) {
        break;
      }
      content += sentence + '. ';
    }
    
    return content.trim();
  }
}

export default DataSanitization;

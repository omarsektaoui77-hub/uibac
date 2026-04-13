// Simple in-memory cache for development
// In production, you'd want to use Redis or similar

interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache: Map<string, CacheItem> = new Map();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new SimpleCache();

// Clean up cache every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => cache.cleanup(), 10 * 60 * 1000);
}

// Cache keys
export const CACHE_KEYS = {
  DRIVE_FILES: (folderId: string) => `drive_files_${folderId}`,
  PDF_TEXT: (fileId: string) => `pdf_text_${fileId}`,
  AI_ANALYSIS: (fileId: string) => `ai_analysis_${fileId}`,
  GENERATED_QUESTIONS: (concepts: string[], difficulty: string, language: string) => 
    `questions_${concepts.join('_')}_${difficulty}_${language}`,
  QUESTION_BANK: (trackId: string, subjectId: string) => `question_bank_${trackId}_${subjectId}`
};

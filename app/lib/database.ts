import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';

export interface QuestionBank {
  id: string;
  trackId: 'sm' | 'svt' | 'pc' | 'lettres' | 'common';
  subjectId: string;
  fileId: string; // CRITICAL: Prevents duplicates
  fileName: string;
  source: 'drive' | 'manual' | 'ai';
  difficulty: 'easy' | 'medium' | 'hard';
  language: 'ar' | 'en' | 'fr' | 'es'; // Multi-language support
  questions: GeneratedQuestion[];
  concepts: string[]; // Reuse later (no re-AI needed)
  summary: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number; // Regenerate safely later
}

export interface GeneratedQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
  xp: number;
  concept?: string;
  difficulty?: string;
}

export interface LessonAnalysis {
  summary: string;
  keyConcepts: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  formulas: string[];
  definitions: Array<{ term: string; definition: string }>;
}

export class QuestionBankService {
  private static readonly COLLECTION_NAME = 'questionBanks';

  /**
   * Save a new question bank to Firestore
   */
  static async saveQuestionBank(questionBank: Omit<QuestionBank, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = doc(collection(db, this.COLLECTION_NAME));
    const id = docRef.id;
    
    const newQuestionBank: QuestionBank = {
      ...questionBank,
      id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: 1
    };

    await setDoc(docRef, newQuestionBank);
    return id;
  }

  /**
   * Get question bank by track and subject
   */
  static async getQuestionBank(trackId: string, subjectId: string): Promise<QuestionBank | null> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('trackId', '==', trackId),
      where('subjectId', '==', subjectId),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as QuestionBank;
  }

  /**
   * Check if question bank exists for track and subject
   */
  static async questionBankExists(trackId: string, subjectId: string): Promise<boolean> {
    const bank = await this.getQuestionBank(trackId, subjectId);
    return bank !== null;
  }

  /**
   * Check if file has already been processed (prevents duplicates)
   */
  static async fileProcessed(fileId: string): Promise<boolean> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('fileId', '==', fileId),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }

  /**
   * Get question bank by track, subject, and language (optimized query)
   */
  static async getQuestionBankByLanguage(trackId: string, subjectId: string, language: string): Promise<QuestionBank | null> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('trackId', '==', trackId),
      where('subjectId', '==', subjectId),
      where('language', '==', language),
      orderBy('version', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as QuestionBank;
  }

  /**
   * Get all question banks for a track and language
   */
  static async getQuestionBanksByTrackAndLanguage(trackId: string, language: string): Promise<QuestionBank[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('trackId', '==', trackId),
      where('language', '==', language),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionBank));
  }

  /**
   * Get all question banks for a track
   */
  static async getQuestionBanksByTrack(trackId: string): Promise<QuestionBank[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('trackId', '==', trackId),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionBank));
  }

  /**
   * Get all question banks
   */
  static async getAllQuestionBanks(): Promise<QuestionBank[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionBank));
  }

  /**
   * Update existing question bank
   */
  static async updateQuestionBank(id: string, updates: Partial<QuestionBank>): Promise<void> {
    const docRef = doc(db, this.COLLECTION_NAME, id);
    await setDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    }, { merge: true });
  }

  /**
   * Get questions for practice (filtered and randomized)
   */
  static async getPracticeQuestions(
    trackId: string, 
    subjectId: string, 
    difficulty?: string,
    count: number = 10,
    language: string = 'en'
  ): Promise<GeneratedQuestion[]> {
    const bank = await this.getQuestionBankByLanguage(trackId, subjectId, language);
    
    if (!bank || bank.questions.length === 0) {
      return [];
    }

    let questions = bank.questions;

    // Filter by difficulty if specified
    if (difficulty) {
      questions = questions.filter(q => q.difficulty === difficulty);
    }

    // Randomize and limit
    const shuffled = questions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Save lesson analysis
   */
  static async saveLessonAnalysis(
    trackId: string,
    subjectId: string,
    fileId: string,
    fileName: string,
    analysis: LessonAnalysis
  ): Promise<void> {
    const docRef = doc(db, 'lessonAnalyses', `${trackId}_${subjectId}_${fileId}`);
    
    await setDoc(docRef, {
      trackId,
      subjectId,
      fileId,
      fileName,
      analysis,
      createdAt: Timestamp.now()
    });
  }

  /**
   * Get lesson analysis
   */
  static async getLessonAnalysis(
    trackId: string,
    subjectId: string,
    fileId: string
  ): Promise<LessonAnalysis | null> {
    const docRef = doc(db, 'lessonAnalyses', `${trackId}_${subjectId}_${fileId}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().analysis as LessonAnalysis;
    }
    
    return null;
  }
}

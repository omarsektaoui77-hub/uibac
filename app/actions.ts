'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

/**
 * Server Actions for Firebase operations
 * These run on the server for better security and performance
 */

/**
 * Get user XP from Firestore
 */
export async function getUserXP(userId: string): Promise<number> {
  try {
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().xp || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error loading XP:', error);
    return 0;
  }
}

/**
 * Save user XP to Firestore
 */
export async function saveUserXP(userId: string, xp: number, name?: string): Promise<boolean> {
  try {
    await setDoc(doc(db, 'users', userId), {
      name: name || 'User',
      xp,
      lastUpdated: new Date().toISOString(),
    });
    console.log('XP saved successfully!');
    return true;
  } catch (error) {
    console.error('Error saving XP:', error);
    return false;
  }
}

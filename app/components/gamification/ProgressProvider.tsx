'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { UserProgress } from '@/app/lib/gamification/userSchema';

// Types for progress state
interface ProgressState {
  user: UserProgress | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  optimisticUpdates: Record<string, any>;
}

interface ProgressContextType extends ProgressState {
  updateProgress: (xp: number, subjectId?: string, activityType?: string) => Promise<void>;
  refreshProgress: () => Promise<void>;
  clearError: () => void;
  getOptimisticProgress: (subjectId?: string) => any;
}

// Action types
type ProgressAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: UserProgress }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'APPLY_OPTIMISTIC_UPDATE'; payload: { key: string; update: any } }
  | { type: 'CLEAR_OPTIMISTIC_UPDATE'; payload: string }
  | { type: 'COMMIT_OPTIMISTIC_UPDATES'; payload: UserProgress };

// Initial state
const initialState: ProgressState = {
  user: null,
  loading: true,
  error: null,
  lastUpdated: null,
  optimisticUpdates: {}
};

// Reducer
function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        optimisticUpdates: {} // Clear optimistic updates on successful fetch
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'APPLY_OPTIMISTIC_UPDATE':
      return {
        ...state,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          [action.payload.key]: action.payload.update
        }
      };
    
    case 'CLEAR_OPTIMISTIC_UPDATE':
      const { [action.payload]: removed, ...rest } = state.optimisticUpdates;
      return {
        ...state,
        optimisticUpdates: rest
      };
    
    case 'COMMIT_OPTIMISTIC_UPDATES':
      return {
        ...state,
        user: action.payload,
        optimisticUpdates: {}
      };
    
    default:
      return state;
  }
}

// Context
const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

// Provider component
interface ProgressProviderProps {
  children: ReactNode;
  userId: string;
}

export function ProgressProvider({ children, userId }: ProgressProviderProps) {
  const [state, dispatch] = useReducer(progressReducer, initialState);

  // Apply optimistic updates to get current state
  const getOptimisticProgress = (subjectId?: string) => {
    if (!state.user) return null;

    let optimisticUser = { ...state.user };

    // Apply all optimistic updates
    for (const [key, update] of Object.entries(state.optimisticUpdates)) {
      if (key.startsWith('global.')) {
        const field = key.substring(7);
        optimisticUser.globalStats = {
          ...optimisticUser.globalStats,
          [field]: update
        };
      } else if (key.startsWith('subject.')) {
        const [_, subjectField] = key.split('.');
        if (optimisticUser.subjects[subjectField]) {
          optimisticUser.subjects[subjectField] = {
            ...optimisticUser.subjects[subjectField],
            ...update
          };
        }
      }
    }

    return optimisticUser;
  };

  // Fetch user progress
  const fetchProgress = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await fetch(`/api/progress/update`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();
      
      if (data.success) {
        dispatch({ type: 'SET_USER', payload: data.user });
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Fetch progress error:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  // Update progress with optimistic updates
  const updateProgress = async (
    xp: number, 
    subjectId?: string, 
    activityType: string = 'question'
  ) => {
    if (!state.user) return;

    // Generate unique key for this update
    const updateKey = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Apply optimistic update immediately
    const optimisticGlobalUpdate = {
      xp: state.user.globalStats.xp + xp,
      questionsAnswered: state.user.globalStats.questionsAnswered + 1,
      lastActive: new Date().toISOString()
    };

    dispatch({
      type: 'APPLY_OPTIMISTIC_UPDATE',
      payload: {
        key: `global.stats`,
        update: optimisticGlobalUpdate
      }
    });

    if (subjectId && state.user.subjects[subjectId]) {
      const optimisticSubjectUpdate = {
        xp: state.user.subjects[subjectId].xp + xp,
        questionsAnswered: state.user.subjects[subjectId].questionsAnswered + 1,
        lastActivity: new Date().toISOString()
      };

      dispatch({
        type: 'APPLY_OPTIMISTIC_UPDATE',
        payload: {
          key: `subject.${subjectId}`,
          update: optimisticSubjectUpdate
        }
      });
    }

    try {
      // Make actual API call
      const response = await fetch('/api/progress/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          earnedXP: xp,
          subjectId,
          activityType,
          sessionId: `session_${Date.now()}`,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      const data = await response.json();

      if (data.success) {
        // Commit the optimistic updates with the actual server data
        dispatch({ type: 'COMMIT_OPTIMISTIC_UPDATES', payload: data.user });
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (error) {
      console.error('Update progress error:', error);
      
      // Rollback optimistic updates
      dispatch({ type: 'CLEAR_OPTIMISTIC_UPDATE', payload: `global.stats` });
      if (subjectId) {
        dispatch({ type: 'CLEAR_OPTIMISTIC_UPDATE', payload: `subject.${subjectId}` });
      }
      
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Update failed' 
      });
    }
  };

  // Refresh progress from server
  const refreshProgress = async () => {
    await fetchProgress();
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Get auth token
  const getAuthToken = async (): Promise<string> => {
    // This would get the Firebase token
    // For now, return a placeholder
    return localStorage.getItem('authToken') || '';
  };

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchProgress();
    }
  }, [userId]);

  // Set up periodic refresh (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.user && !state.error) {
        fetchProgress();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [state.user, state.error]);

  const contextValue: ProgressContextType = {
    ...state,
    updateProgress,
    refreshProgress,
    clearError,
    getOptimisticProgress
  };

  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  );
}

// Hook to use progress context
export function useProgress() {
  const context = useContext(ProgressContext);
  
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  
  return context;
}

// Hook to get current progress with optimistic updates
export function useCurrentProgress() {
  const { user, getOptimisticProgress } = useProgress();
  return getOptimisticProgress() || user;
}

// Hook to get global stats with optimistic updates
export function useGlobalStats() {
  const currentProgress = useCurrentProgress();
  return currentProgress?.globalStats;
}

// Hook to get subject progress with optimistic updates
export function useSubjectProgress(subjectId: string) {
  const currentProgress = useCurrentProgress();
  return currentProgress?.subjects[subjectId];
}

export default ProgressProvider;

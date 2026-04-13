'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentProgress, useGlobalStats } from './ProgressProvider';
import { XPSystem } from '@/app/lib/gamification/xpSystem';
import { RankSystem } from '@/app/lib/gamification/rankSystem';

interface OptimisticProgressBarProps {
  showDetails?: boolean;
  animated?: boolean;
  size?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark';
  className?: string;
  onLevelUp?: (fromLevel: number, toLevel: number) => void;
}

/**
 * Optimistic Progress Bar with real-time updates
 * Shows immediate feedback for user actions
 */
export function OptimisticProgressBar({
  showDetails = true,
  animated = true,
  size = 'medium',
  theme = 'light',
  className = '',
  onLevelUp
}: OptimisticProgressBarProps) {
  const currentProgress = useCurrentProgress();
  const globalStats = useGlobalStats();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [previousXP, setPreviousXP] = useState(0);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ from: number; to: number } | null>(null);

  // Calculate progress data
  const xpResult = currentProgress ? XPSystem.calculateXPResult(currentProgress.globalStats.xp) : null;
  const rankProgress = currentProgress ? RankSystem.getRankProgress(currentProgress.globalStats.level) : null;
  
  const progressPercentage = xpResult ? xpResult.progressPercentage : 0;
  const currentXP = currentProgress?.globalStats.xp || 0;
  const currentLevel = currentProgress?.globalStats.level || 1;

  // Track XP changes for animations
  useEffect(() => {
    if (currentXP !== previousXP) {
      setIsUpdating(true);
      
      // Check for level up
      const oldResult = XPSystem.calculateXPResult(previousXP);
      const newResult = XPSystem.calculateXPResult(currentXP);
      
      if (newResult.level > oldResult.level) {
        setLevelUpData({ from: oldResult.level, to: newResult.level });
        setShowLevelUpAnimation(true);
        onLevelUp?.(oldResult.level, newResult.level);
      }
      
      setPreviousXP(currentXP);
      
      // Reset updating state after animation
      const timer = setTimeout(() => setIsUpdating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentXP, previousXP, onLevelUp]);

  // Size configurations
  const sizeConfig = {
    small: { height: 8, fontSize: 12, padding: 4 },
    medium: { height: 16, fontSize: 14, padding: 6 },
    large: { height: 24, fontSize: 16, padding: 8 }
  };

  const config = sizeConfig[size];
  const themeConfig = {
    light: {
      background: '#F3F4F6',
      progress: '#3B82F6',
      border: '#E5E7EB',
      text: '#1F2937',
      accent: '#10B981'
    },
    dark: {
      background: '#1F2937',
      progress: '#8B5CF6',
      border: '#374151',
      text: '#F9FAFB',
      accent: '#60A5FA'
    }
  };

  const colors = themeConfig[theme];

  if (!currentProgress || !xpResult) {
    return (
      <div className={`progress-bar-loading ${className}`}>
        <div className="loading-skeleton" style={{ height: config.height }} />
      </div>
    );
  }

  return (
    <div className={`optimistic-progress-bar ${className}`}>
      {/* Main Progress Bar */}
      <motion.div
        className="progress-bar-wrapper"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Background track */}
        <div 
          className="progress-track"
          style={{
            backgroundColor: colors.background,
            borderColor: colors.border,
            height: `${config.height}px`
          }}
        />

        {/* Animated progress fill */}
        <motion.div
          className="progress-fill"
          style={{
            backgroundColor: colors.progress,
            height: `${config.height}px`,
            borderRadius: `${config.height / 2}px`
          }}
          animate={{
            width: `${progressPercentage}%`
          }}
          transition={{
            duration: isUpdating ? 0.3 : 1.5,
            ease: isUpdating ? 'easeOut' : 'easeInOut'
          }}
        />

        {/* Updating indicator */}
        <AnimatePresence>
          {isUpdating && (
            <motion.div
              className="updating-indicator"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: 'absolute',
                right: `${100 - progressPercentage}%`,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: colors.accent,
                width: '12px',
                height: '12px',
                borderRadius: '50%'
              }}
            />
          )}
        </AnimatePresence>

        {/* Progress text overlay */}
        <motion.div
          className="progress-text"
          animate={{
            scale: isUpdating ? 1.1 : 1
          }}
          style={{
            color: colors.text,
            fontSize: `${config.fontSize}px`,
            fontWeight: 600,
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {Math.round(progressPercentage)}%
        </motion.div>

        {/* XP display */}
        <div className="xp-display" style={{ color: colors.text, fontSize: `${config.fontSize}px` }}>
          <span className="current-xp">{XPSystem.formatXP(currentXP)}</span>
          <span className="xp-separator"> / </span>
          <span className="next-level-xp">{XPSystem.formatXP(xpResult.xpForNextLevel)}</span>
        </div>
      </motion.div>

      {/* Level and Rank Info */}
      {showDetails && (
        <motion.div
          className="progress-details"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="level-rank-info">
            <div className="level-info">
              <span className="level-label">Level</span>
              <motion.span 
                className="level-value"
                animate={{ scale: isUpdating ? 1.2 : 1 }}
                style={{ color: colors.text }}
              >
                {currentLevel}
              </motion.span>
            </div>
            
            {rankProgress && (
              <div className="rank-info">
                <span className="rank-label">Rank</span>
                <div 
                  className="rank-badge"
                  style={{ 
                    backgroundColor: rankProgress.currentRank.color,
                    color: '#fff'
                  }}
                >
                  {rankProgress.currentRank.name}
                </div>
              </div>
            )}
          </div>

          {/* XP to next level */}
          <div className="xp-to-next" style={{ color: colors.text }}>
            <span className="xp-remaining">
              {XPSystem.formatXP(xpResult.xpRemaining)} to Level {currentLevel + 1}
            </span>
          </div>
        </motion.div>
      )}

      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUpAnimation && levelUpData && (
          <motion.div
            className="level-up-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="level-up-content"
              initial={{ scale: 0.5, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 180 }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 30 
              }}
            >
              <div className="level-up-icon">Level Up!</div>
              <div className="level-up-text">
                {levelUpData.from} <span className="arrow">»</span> {levelUpData.to}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styles */}
      <style jsx>{`
        .optimistic-progress-bar {
          position: relative;
          width: 100%;
          margin: 8px 0;
        }

        .progress-bar-wrapper {
          position: relative;
          width: 100%;
          height: ${config.height}px;
        }

        .progress-track {
          width: 100%;
          height: 100%;
          border-radius: calc(${config.height}px / 2);
          border: 1px solid;
          position: relative;
          overflow: hidden;
        }

        .progress-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          border-radius: calc(${config.height}px / 2);
          transform-origin: left center;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: bold;
          z-index: 10;
          pointer-events: none;
          user-select: none;
        }

        .xp-display {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-weight: 600;
          opacity: 0.8;
        }

        .updating-indicator {
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-50%) scale(1.2); }
        }

        .progress-details {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .level-rank-info {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .level-info, .rank-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .level-label, .rank-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.7;
        }

        .level-value {
          font-size: 18px;
          font-weight: bold;
        }

        .rank-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .xp-to-next {
          font-size: 12px;
          opacity: 0.8;
        }

        .level-up-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          pointer-events: none;
        }

        .level-up-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px 32px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .level-up-icon {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .level-up-text {
          font-size: 20px;
          font-weight: 600;
        }

        .arrow {
          margin: 0 8px;
          opacity: 0.8;
        }

        .progress-bar-loading {
          position: relative;
          width: 100%;
          margin: 8px 0;
        }

        .loading-skeleton {
          width: 100%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export default OptimisticProgressBar;

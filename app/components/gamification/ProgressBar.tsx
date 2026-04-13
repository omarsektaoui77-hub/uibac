'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XPSystem, XPResult } from '@/app/lib/gamification/xpSystem';
import { RankSystem, RankProgress } from '@/app/lib/gamification/rankSystem';

interface ProgressBarProps {
  currentXP: number;
  currentLevel: number;
  targetXP?: number; // For specific goals
  showDetails?: boolean;
  animated?: boolean;
  size?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark';
  className?: string;
}

/**
 * Animated Progress Bar Component with Gamification
 * Displays user progress toward next level with animations and details
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentXP,
  currentLevel,
  targetXP,
  showDetails = true,
  animated = true,
  size = 'medium',
  theme = 'light',
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Calculate progress data
  const xpResult = XPSystem.calculateXPResult(currentXP);
  const rankProgress = RankSystem.getRankProgress(currentLevel);
  
  const progressPercentage = targetXP 
    ? Math.min(100, ((currentXP - xpResult.totalXPForCurrentLevel) / (targetXP - xpResult.totalXPForCurrentLevel)) * 100)
    : xpResult.progressPercentage;

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

  // Animation variants
  const progressVariants = {
    initial: { width: 0 },
    animate: { 
      width: animated ? `${progressPercentage}%` : `${progressPercentage}%`,
      transition: { duration: 1.5, ease: 'easeOut' }
    }
  };

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div 
      className={`progress-bar-container ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ '--progress-height': `${config.height}px` }}
    >
      {/* Main Progress Bar */}
      <motion.div
        ref={progressRef}
        className="progress-bar-wrapper"
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
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
          variants={progressVariants}
          initial="initial"
          animate="animate"
          style={{
            backgroundColor: colors.progress,
            height: `${config.height}px`,
            borderRadius: `${config.height / 2}px`
          }}
        />

        {/* Animated shimmer effect */}
        {animated && (
          <motion.div
            className="progress-shimmer"
            animate={{
              x: ['-100%', '100%'],
              transition: { duration: 2, repeat: Infinity, ease: 'linear' }
            }}
            style={{
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`
            }}
          />
        )}

        {/* Progress text overlay */}
        <motion.div
          className="progress-text"
          animate={{
            opacity: isHovered ? 1 : 0.8
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

        {/* Milestone markers */}
        {showDetails && (
          <div className="progress-milestones">
            {[25, 50, 75].map(milestone => (
              <div
                key={milestone}
                className={`milestone ${progressPercentage >= milestone ? 'reached' : ''}`}
                style={{
                  left: `${milestone}%`,
                  backgroundColor: colors.accent
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Detailed stats panel */}
      <AnimatePresence>
        {showDetails && isHovered && (
          <motion.div
            className="progress-details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="details-content" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
              {/* Level and XP Info */}
              <div className="level-info">
                <div className="level-display">
                  <span className="level-number" style={{ color: colors.text }}>
                    Level {currentLevel}
                  </span>
                  <div 
                    className="rank-badge" 
                    style={{ 
                      backgroundColor: rankProgress.currentRank?.color || colors.progress,
                      color: '#fff'
                    }}
                  >
                    {rankProgress.currentRank?.icon && (
                      <span className="rank-icon">{rankProgress.currentRank.icon}</span>
                    )}
                    <span className="rank-name">{rankProgress.currentRank?.name}</span>
                  </div>
                </div>

                <div className="xp-info">
                  <div className="xp-current">
                    <span className="xp-label">Current XP</span>
                    <span className="xp-value" style={{ color: colors.text }}>
                      {XPSystem.formatXP(currentXP)}
                    </span>
                  </div>
                  <div className="xp-next">
                    <span className="xp-label">Next Level</span>
                    <span className="xp-value" style={{ color: colors.text }}>
                      {XPSystem.formatXP(xpResult.xpRemaining)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress breakdown */}
              <div className="progress-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">Progress to Level {currentLevel + 1}</span>
                  <div className="breakdown-bar">
                    <div 
                      className="breakdown-fill" 
                      style={{ 
                        width: `${progressPercentage}%`,
                        backgroundColor: colors.progress 
                      }}
                    />
                  </div>
                  <span className="breakdown-percentage" style={{ color: colors.text }}>
                    {Math.round(progressPercentage)}%
                  </span>
                </div>

                {targetXP && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">Goal Progress</span>
                    <div className="breakdown-bar">
                      <div 
                        className="breakdown-fill" 
                        style={{ 
                          width: `${Math.min(100, ((currentXP - xpResult.totalXPForCurrentLevel) / (targetXP - xpResult.totalXPForCurrentLevel)) * 100)}%`,
                          backgroundColor: colors.accent 
                        }}
                      />
                    </div>
                    <span className="breakdown-percentage" style={{ color: colors.text }}>
                      {Math.round(Math.min(100, ((currentXP - xpResult.totalXPForCurrentLevel) / (targetXP - xpResult.totalXPForCurrentLevel)) * 100))}%
                    </span>
                  </div>
                )}
              </div>

              {/* Rank progress */}
              <div className="rank-progress">
                <div className="rank-current">
                  <span className="rank-label">Current Rank</span>
                  <div className="rank-info">
                    <div 
                      className="rank-color-indicator" 
                      style={{ backgroundColor: rankProgress.currentRank?.color }}
                    />
                    <span className="rank-name" style={{ color: colors.text }}>
                      {rankProgress.currentRank?.name}
                    </span>
                  </div>
                </div>

                {rankProgress.nextRank && (
                  <div className="rank-next">
                    <span className="rank-label">Next Rank</span>
                    <div className="rank-info">
                      <div 
                        className="rank-color-indicator" 
                        style={{ backgroundColor: rankProgress.nextRank.color }}
                      />
                      <span className="rank-name" style={{ color: colors.text }}>
                        {rankProgress.nextRank.name}
                      </span>
                      <span className="rank-progress-text" style={{ color: colors.text }}>
                        {rankProgress.progressToNextRank}/{rankProgress.nextRank.minLevel - rankProgress.currentRank?.minLevel}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Time estimates */}
              <div className="time-estimates">
                <div className="estimate-item">
                  <span className="estimate-label">Est. Time to Next Level</span>
                  <span className="estimate-value" style={{ color: colors.text }}>
                    {xpResult.xpRemaining > 0 ? '~1 hour' : 'Completed!'}
                  </span>
                </div>
                <div className="estimate-item">
                  <span className="estimate-label">Study Streak</span>
                  <span className="estimate-value" style={{ color: colors.text }}>
                    {/* Would come from user data */}
                    5 days
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// CSS-in-JS styles
const styles = `
  .progress-bar-container {
    position: relative;
    width: 100%;
    margin: 8px 0;
    --progress-height: 16px;
  }

  .progress-bar-wrapper {
    position: relative;
    width: 100%;
    height: var(--progress-height);
  }

  .progress-track {
    width: 100%;
    height: 100%;
    border-radius: calc(var(--progress-height) / 2);
    border: 1px solid;
    position: relative;
    overflow: hidden;
  }

  .progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: calc(var(--progress-height) / 2);
    transform-origin: left center;
  }

  .progress-shimmer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: calc(var(--progress-height) / 2);
    pointer-events: none;
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

  .progress-milestones {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .milestone {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    opacity: 0.3;
    transition: opacity 0.3s ease;
  }

  .milestone.reached {
    opacity: 0.8;
    box-shadow: 0 0 4px rgba(59, 130, 246, 0.4);
  }

  .progress-details {
    position: absolute;
    bottom: calc(100% + 12px);
    left: 0;
    min-width: 280px;
    max-width: 320px;
    border-radius: 12px;
    border: 1px solid;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    z-index: 50;
    pointer-events: none;
  }

  .details-content {
    padding: 16px;
    border-radius: 8px;
  }

  .level-info {
    margin-bottom: 16px;
    text-align: center;
  }

  .level-display {
    margin-bottom: 12px;
  }

  .level-number {
    font-size: 24px;
    font-weight: bold;
    display: block;
    margin-bottom: 8px;
  }

  .rank-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .rank-icon {
    font-size: 14px;
  }

  .xp-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .xp-current, .xp-next {
    text-align: center;
  }

  .xp-label {
    display: block;
    font-size: 11px;
    opacity: 0.7;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .xp-value {
    font-size: 18px;
    font-weight: bold;
  }

  .progress-breakdown {
    margin-bottom: 16px;
  }

  .breakdown-item {
    margin-bottom: 12px;
  }

  .breakdown-label {
    display: block;
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 6px;
  }

  .breakdown-bar {
    position: relative;
    width: 100%;
    height: 6px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .breakdown-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 1.5s ease-out;
  }

  .breakdown-percentage {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    font-weight: 600;
  }

  .rank-progress {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .rank-current, .rank-next {
    text-align: center;
  }

  .rank-label {
    display: block;
    font-size: 11px;
    opacity: 0.7;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .rank-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .rank-color-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .rank-progress-text {
    font-size: 11px;
    opacity: 0.8;
  }

  .time-estimates {
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .estimate-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .estimate-label {
    font-size: 11px;
    opacity: 0.7;
  }

  .estimate-value {
    font-size: 12px;
    font-weight: 600;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

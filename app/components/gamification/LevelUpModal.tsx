// @ts-nocheck - TypeScript type inference issues
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RankSystem, RankMilestone } from '@/app/lib/gamification/rankSystem';
import { XPSystem } from '@/app/lib/gamification/xpSystem';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromLevel: number;
  toLevel: number;
  rankUp: boolean;
  milestone?: RankMilestone;
  soundEnabled?: boolean;
  animationEnabled?: boolean;
}

/**
 * Level-Up Modal with Confetti and Sound Effects
 * Celebrates user achievements with animations and rewards
 */
export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  fromLevel,
  toLevel,
  rankUp,
  milestone,
  soundEnabled = true,
  animationEnabled = true
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentRewardIndex, setCurrentRewardIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const levelDifference = toLevel - fromLevel;
  const rankInfo = rankUp ? RankSystem.checkRankUp(fromLevel, toLevel) : null;
  const rewards = milestone?.rewards || [];

  // Play sound effect
  useEffect(() => {
    if (isOpen && soundEnabled && !isPlaying) {
      playLevelUpSound(rankInfo?.milestone?.celebration.type || 'confetti');
      setIsPlaying(true);
    }
  }, [isOpen, soundEnabled, rankInfo?.milestone?.celebration.type]);

  // Trigger confetti
  useEffect(() => {
    if (isOpen && animationEnabled) {
      setShowConfetti(true);
      setCurrentRewardIndex(0);
      
      // Auto-hide after animation
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, animationEnabled]);

  // Auto-close modal after delay
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
        setIsPlaying(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const playLevelUpSound = (celebrationType: string) => {
    try {
      const audio = new Audio();
      
      // Map celebration types to sound files
      const soundFiles: Record<string, string> = {
        confetti: '/sounds/level-up-basic.mp3',
        fireworks: '/sounds/level-up-novice.mp3',
        spotlight: '/sounds/level-up-intermediate.mp3',
        royal: '/sounds/level-up-advanced.mp3'
      };

      audio.src = soundFiles[celebrationType] || soundFiles.confetti;
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.log('Sound play failed:', error);
      });
    } catch (error) {
      console.log('Audio creation failed:', error);
    }
  };

  const getConfettiColors = (celebrationType: string): string[] => {
    const colorSchemes: Record<string, string[]> = {
      confetti: ['#FFD700', '#FFA500', '#FF6B6B', '#4CAF50'],
      fireworks: ['#FF6B6B', '#4CAF50', '#2196F3', '#3F51B5'],
      spotlight: ['#7C3AED', '#F59E0B', '#FBBF24', '#10B981'],
      royal: ['#FFD700', '#FFA500', '#FF6B6B', '#4CAF50', '#2196F3']
    };
    
    return colorSchemes[celebrationType] || colorSchemes.confetti;
  };

  const getConfettiConfig = () => {
    const celebrationType = milestone?.celebration.type || 'confetti';
    
    return {
      particleCount: celebrationType === 'royal' ? 200 : 100,
      spread: celebrationType === 'fireworks' ? 120 : 90,
      startVelocity: celebrationType === 'royal' ? 25 : 15,
      gravity: celebrationType === 'fireworks' ? 0.1 : 0.15,
      colors: getConfettiColors(celebrationType),
      tweenDuration: celebrationType === 'royal' ? 3000 : 2000
    };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="level-up-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            className="level-up-modal"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30 
            }}
          >
            {/* Close button */}
            <motion.button
              className="close-button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
            >
              ✕
            </motion.button>

            {/* Level up header */}
            <motion.div
              className="level-up-header"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="level-up-icon">
                {levelDifference > 1 ? (
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🎊
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6 }}
                  >
                    ⭐
                  </motion.div>
                )}
              </div>
              
              <h1 className="level-up-title">
                {levelDifference > 1 ? 'LEVEL UP!' : 'LEVEL UP!'}
              </h1>
              
              <div className="level-up-subtitle">
                {rankUp ? (
                  <span>
                    Level {fromLevel} → Level {toLevel}
                    {rankInfo?.newRank && (
                      <span className="rank-name">
                        ({rankInfo.newRank.name} Rank)
                      </span>
                    )}
                  </span>
                ) : (
                  <span>
                    Level {fromLevel} → Level {toLevel}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Milestone celebration */}
            {milestone && (
              <motion.div
                className="milestone-celebration"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div className="milestone-icon">
                  {milestone.celebration.type === 'royal' && '👑'}
                  {milestone.celebration.type === 'fireworks' && '🎆'}
                  {milestone.celebration.type === 'spotlight' && '💡'}
                  {milestone.celebration.type === 'confetti' && '🎊'}
                </div>
                
                <h2 className="milestone-title">
                  {milestone.rank}
                </h2>
                
                <p className="milestone-message">
                  {milestone.celebration.message}
                </p>
              </motion.div>
            )}

            {/* Rewards display */}
            <motion.div
              className="rewards-section"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <h3 className="rewards-title">
                🎁 Rewards Unlocked!
              </h3>
              
              <div className="rewards-grid">
                {rewards.map((reward, index) => (
                  <motion.div
                    key={reward.name}
                    className={`reward-item ${currentRewardIndex === index ? 'active' : ''}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ 
                      scale: currentRewardIndex === index ? 1.1 : 1,
                      opacity: 1 
                    }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="reward-icon">
                      {reward.icon}
                    </div>
                    <div className="reward-info">
                      <div className="reward-name">
                        {reward.name}
                      </div>
                      <div className="reward-description">
                        {reward.description}
                      </div>
                      <div className="reward-rarity">
                        <span className={`rarity ${reward.rarity}`}>
                          {reward.rarity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="modal-actions">
                <motion.button
                  className="action-button primary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setCurrentRewardIndex((prev) => (prev + 1) % rewards.length);
                  }}
                >
                  Next Reward →
                </motion.button>
                
                <motion.button
                  className="action-button secondary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                >
                  Continue Learning
                </motion.button>
              </div>
            </motion.div>

            {/* Stats summary */}
            <motion.div
              className="stats-summary"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <div className="stat-item">
                <div className="stat-label">Total XP</div>
                <div className="stat-value">
                  {XPSystem.formatXP(XPSystem.getXPForLevel(toLevel))}
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-label">XP Bonus</div>
                <div className="stat-value bonus">
                  +{XPSystem.getLevelUpRewards(toLevel).xpBonus}
                </div>
              </div>
              
              {rankUp && rankInfo?.newRank && (
                <div className="stat-item">
                  <div className="stat-label">New Perks</div>
                  <div className="stat-value perks">
                    {rankInfo.newRank.perks.slice(0, 2).join(', ')}
                    {rankInfo.newRank.perks.length > 2 && '...'}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* Confetti animation overlay */}
          <AnimatePresence>
            {showConfetti && (
              <motion.div
                className="confetti-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ConfettiAnimation config={getConfettiConfig()} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Confetti animation component
const ConfettiAnimation: React.FC<{ config: any }> = ({ config }) => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
  }>>([]);

  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < config.particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * config.startVelocity,
        vy: Math.random() * -config.startVelocity - 5,
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        size: Math.random() * 4 + 2
      });
    }
    setParticles(newParticles);
  }, [config]);

  return (
    <div className="confetti-animation">
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="confetti-particle"
          initial={{ 
            x: particle.x, 
            y: particle.y,
            scale: 0,
            opacity: 1 
          }}
          animate={{
            x: particle.x + particle.vx * 3,
            y: particle.y + particle.vy * 3 + (config.gravity * 3 * 3),
            scale: [1, 1.2, 1],
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: config.tweenDuration,
            ease: 'easeOut'
          }}
          style={{
            backgroundColor: particle.color,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            borderRadius: '50%'
          }}
        />
      ))}
    </div>
  );
};

// CSS-in-JS styles
const styles = `
  .level-up-modal-overlay {
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
    backdrop-filter: blur(4px);
  }

  .level-up-modal {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    padding: 32px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    position: relative;
  }

  .close-button {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: #fff;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  .level-up-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .level-up-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .level-up-title {
    font-size: 32px;
    font-weight: bold;
    color: #fff;
    margin: 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .level-up-subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 8px;
  }

  .rank-name {
    color: #FFD700;
    font-weight: bold;
    margin-left: 8px;
  }

  .milestone-celebration {
    text-align: center;
    margin-bottom: 24px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }

  .milestone-icon {
    font-size: 36px;
    margin-bottom: 12px;
  }

  .milestone-title {
    font-size: 24px;
    font-weight: bold;
    color: #fff;
    margin: 0;
  }

  .milestone-message {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 8px;
  }

  .rewards-section {
    margin-bottom: 24px;
  }

  .rewards-title {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
    text-align: center;
    margin-bottom: 16px;
  }

  .rewards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  .reward-item {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .reward-item.active {
    background: rgba(255, 255, 255, 0.2);
    border-color: #FFD700;
    transform: scale(1.05);
  }

  .reward-item:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(1.05);
  }

  .reward-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .reward-info {
    text-align: left;
  }

  .reward-name {
    font-size: 14px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 4px;
  }

  .reward-description {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 8px;
  }

  .reward-rarity {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
  }

  .rarity.common { background: #6B7280; }
  .rarity.rare { background: #3B82F6; }
  .rarity.epic { background: #8B5CF6; }
  .rarity.legendary { background: #FFD700; }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .action-button {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-button.primary {
    background: #FFD700;
    color: #000;
  }

  .action-button.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .stats-summary {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 16px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    font-size: 16px;
    font-weight: bold;
    color: #fff;
  }

  .stat-value.bonus {
    color: #4CAF50;
  }

  .stat-value.perks {
    font-size: 14px;
  }

  .confetti-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2000;
  }

  .confetti-particle {
    position: absolute;
    pointer-events: none;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

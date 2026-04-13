'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProgress } from '@/app/lib/gamification/userSchema';
import { BACCALAUREATE_SUBJECTS } from '@/app/lib/gamification/userSchema';
import { XPSystem } from '@/app/lib/gamification/xpSystem';
import { StreakSystem } from '@/app/lib/gamification/streakSystem';

interface DynamicFeedbackProps {
  user: UserProgress;
  recentActivity?: Array<{
    subjectId: string;
    xpEarned: number;
    accuracy: number;
    timestamp: string;
  }>;
  showRecommendations?: boolean;
  aiInsights?: boolean;
  className?: string;
}

interface AIInsight {
  type: 'strength' | 'weakness' | 'recommendation' | 'motivation' | 'achievement';
  title: string;
  message: string;
  subjectId?: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  icon?: string;
  color?: string;
}

/**
 * Dynamic Feedback UI with AI-Driven Insights
 * Provides smart recommendations and performance analysis
 */
export const DynamicFeedback: React.FC<DynamicFeedbackProps> = ({
  user,
  recentActivity = [],
  showRecommendations = true,
  aiInsights = true,
  className = ''
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Generate AI insights based on user data
  useEffect(() => {
    const generatedInsights = generateAIInsights(user, recentActivity);
    setInsights(generatedInsights.insights);
    setWeaknesses(generatedInsights.weaknesses);
    setStrengths(generatedInsights.strengths);
    setRecommendations(generatedInsights.recommendations);
  }, [user, recentActivity]);

  const getSubjectPerformance = () => {
    const subjects = Object.entries(user.subjects).map(([id, progress]) => ({
      id,
      name: BACCALAUREATE_SUBJECTS[id]?.displayName || id,
      xp: progress.xp,
      level: progress.level,
      accuracy: progress.averageAccuracy || 0,
      streak: progress.streak,
      icon: BACCALAUREATE_SUBJECTS[id]?.icon || 'book',
      color: BACCALAUREATE_SUBJECTS[id]?.color || '#6B7280'
    }));

    return subjects.sort((a, b) => b.xp - a.xp);
  };

  const getWeakestSubject = () => {
    const subjects = Object.entries(user.subjects);
    if (subjects.length === 0) return null;
    
    return subjects.reduce((weakest, [id, progress]) => 
      progress.xp < weakest[1].xp ? [id, progress] : weakest
    )[0];
  };

  const getStrongestSubject = () => {
    const subjects = Object.entries(user.subjects);
    if (subjects.length === 0) return null;
    
    return subjects.reduce((strongest, [id, progress]) => 
      progress.xp > strongest[1].xp ? [id, progress] : strongest
    )[0];
  };

  return (
    <div className={`dynamic-feedback ${className}`}>
      {/* Header */}
      <motion.div
        className="feedback-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="feedback-title">
          🧠 Smart Learning Insights
        </h2>
        <p className="feedback-subtitle">
          Personalized feedback based on your performance
        </p>
      </motion.div>

      {/* Performance Overview */}
      <motion.div
        className="performance-overview"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div className="overview-cards">
          {/* Overall Performance */}
          <div className="performance-card overall">
            <div className="card-header">
              <div className="card-icon">📊</div>
              <h3>Overall Progress</h3>
            </div>
            <div className="card-content">
              <div className="stat-row">
                <span className="stat-label">Level</span>
                <span className="stat-value">{user.globalStats.level}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total XP</span>
                <span className="stat-value">{XPSystem.formatXP(user.globalStats.xp)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Streak</span>
                <span className="stat-value">{user.globalStats.streak} days</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Rank</span>
                <span className="stat-value rank-badge" style={{ 
                  backgroundColor: XPSystem.getLevelColor(user.globalStats.level) 
                }}>
                  {user.globalStats.rank}
                </span>
              </div>
            </div>
          </div>

          {/* Subject Performance */}
          <div className="performance-card subjects">
            <div className="card-header">
              <div className="card-icon">📚</div>
              <h3>Subject Performance</h3>
            </div>
            <div className="subjects-grid">
              {getSubjectPerformance().map((subject, index) => (
                <motion.div
                  key={subject.id}
                  className={`subject-item ${index === 0 ? 'weakest' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div 
                    className="subject-icon" 
                    style={{ backgroundColor: subject.color }}
                  >
                    {subject.icon}
                  </div>
                  <div className="subject-info">
                    <div className="subject-name">{subject.name}</div>
                    <div className="subject-stats">
                      <div className="subject-stat">
                        <span className="stat-label">Level</span>
                        <span className="stat-value">{subject.level}</span>
                      </div>
                      <div className="subject-stat">
                        <span className="stat-label">XP</span>
                        <span className="stat-value">{XPSystem.formatXP(subject.xp)}</span>
                      </div>
                      <div className="subject-stat">
                        <span className="stat-label">Streak</span>
                        <span className="stat-value">{subject.streak}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Insights Section */}
      {aiInsights && (
        <motion.div
          className="ai-insights"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="insights-header">
            <div className="insights-icon">🤖</div>
            <h3>AI-Powered Insights</h3>
          </div>

          <div className="insights-grid">
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                className={`insight-card ${insight.type}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <div className="insight-header">
                  <div className="insight-icon" style={{ color: insight.color }}>
                    {insight.icon || getDefaultIcon(insight.type)}
                  </div>
                  <div className="insight-title-area">
                    <h4 className="insight-title">{insight.title}</h4>
                    <div className={`insight-priority ${insight.priority}`}>
                      {insight.priority.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="insight-content">
                  <p className="insight-message">{insight.message}</p>
                  {insight.actionable && (
                    <motion.button
                      className="action-button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleInsightAction(insight)}
                    >
                      Take Action
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations Section */}
      {showRecommendations && (
        <motion.div
          className="recommendations"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="recommendations-header">
            <div className="recommendations-icon">🎯</div>
            <h3>Smart Recommendations</h3>
          </div>

          <div className="recommendations-content">
            {/* Weakness-based recommendations */}
            {weaknesses.length > 0 && (
              <div className="recommendation-group">
                <h4 className="group-title">Focus Areas</h4>
                <div className="recommendation-list">
                  {weaknesses.map((weakness, index) => (
                    <motion.div
                      key={index}
                      className="recommendation-item weakness"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index, duration: 0.3 }}
                    >
                      <div className="recommendation-icon">⚠️</div>
                      <div className="recommendation-text">
                        <strong>Improve {weakness}</strong>
                        <p>Spend more time on {weakness} to boost your overall performance</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Strength-based recommendations */}
            {strengths.length > 0 && (
              <div className="recommendation-group">
                <h4 className="group-title">Leverage Strengths</h4>
                <div className="recommendation-list">
                  {strengths.map((strength, index) => (
                    <motion.div
                      key={index}
                      className="recommendation-item strength"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index, duration: 0.3 }}
                    >
                      <div className="recommendation-icon">💪</div>
                      <div className="recommendation-text">
                        <strong>Excel in {strength}</strong>
                        <p>Use your strength in {strength} to tackle more challenging topics</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* General recommendations */}
            <div className="recommendation-group">
              <h4 className="group-title">General Tips</h4>
              <div className="recommendation-list">
                {recommendations.map((recommendation, index) => (
                  <motion.div
                    key={index}
                    className="recommendation-item general"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                  >
                    <div className="recommendation-icon">💡</div>
                    <div className="recommendation-text">{recommendation}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Activity */}
      {recentActivity && recentActivity.length > 0 && (
        <motion.div
          className="recent-activity"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <div className="activity-header">
            <div className="activity-icon">📈</div>
            <h3>Recent Activity</h3>
          </div>
          <div className="activity-timeline">
            {recentActivity.slice(0, 5).map((activity, index) => (
              <motion.div
                key={index}
                className="activity-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.3 }}
              >
                <div className="activity-time">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
                <div className="activity-details">
                  <div className="activity-subject">
                    {BACCALAUREATE_SUBJECTS[activity.subjectId]?.displayName || activity.subjectId}
                  </div>
                  <div className="activity-stats">
                    <span className="activity-xp">+{activity.xpEarned} XP</span>
                    <span className={`activity-accuracy ${activity.accuracy >= 80 ? 'high' : activity.accuracy >= 60 ? 'medium' : 'low'}`}>
                      {activity.accuracy}%
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Helper functions
function generateAIInsights(user: UserProgress, recentActivity: any[]): {
  insights: AIInsight[];
  weaknesses: string[];
  strengths: string[];
  recommendations: string[];
} {
  const insights: AIInsight[] = [];
  const weaknesses: string[] = [];
  const strengths: string[] = [];
  const recommendations: string[] = [];

  // Analyze subject performance
  const subjectEntries = Object.entries(user.subjects);
  const sortedSubjects = subjectEntries.sort(([, a], [, b]) => b.xp - a.xp);
  
  if (sortedSubjects.length > 0) {
    const weakestSubject = sortedSubjects[0];
    const strongestSubject = sortedSubjects[sortedSubjects.length - 1];
    
    // Weakness insight
    insights.push({
      type: 'weakness',
      title: 'Focus Area Identified',
      message: `You're doing great in most subjects, but ${BACCALAUREATE_SUBJECTS[weakestSubject[0]]?.displayName || weakestSubject[0]} needs more attention.`,
      subjectId: weakestSubject[0],
      actionable: true,
      priority: 'high',
      icon: '🎯',
      color: '#EF4444'
    });
    
    weaknesses.push(BACCALAUREATE_SUBJECTS[weakestSubject[0]]?.displayName || weakestSubject[0]);
    
    // Strength insight
    insights.push({
      type: 'strength',
      title: 'Strength Area Identified',
      message: `You excel in ${BACCALAUREATE_SUBJECTS[strongestSubject[0]]?.displayName || strongestSubject[0]}! Keep leveraging this strength.`,
      subjectId: strongestSubject[0],
      actionable: true,
      priority: 'medium',
      icon: '💪',
      color: '#10B981'
    });
    
    strengths.push(BACCALAUREATE_SUBJECTS[strongestSubject[0]]?.displayName || strongestSubject[0]);
  }

  // Streak analysis
  if (user.globalStats.streak >= 7) {
    insights.push({
      type: 'achievement',
      title: 'Amazing Consistency!',
      message: `${user.globalStats.streak} day streak! You're showing incredible dedication to your learning journey.`,
      actionable: false,
      priority: 'high',
      icon: '🔥',
      color: '#FF6B6B'
    });
    
    recommendations.push('Maintain your current study schedule to keep the streak alive!');
  } else if (user.globalStats.streak >= 3) {
    recommendations.push('Try to study a bit more consistently to reach a week-long streak!');
  }

  // Level progression insight
  const xpResult = XPSystem.calculateXPResult(user.globalStats.xp);
  if (xpResult.progressPercentage >= 80) {
    insights.push({
      type: 'motivation',
      title: 'Almost There!',
      message: `You're ${xpResult.xpRemaining} XP away from level ${xpResult.level + 1}! Keep going!`,
      actionable: false,
      priority: 'medium',
      icon: '🚀',
      color: '#F59E0B'
    });
  }

  // Overall performance insight
  if (user.globalStats.averageAccuracy >= 85) {
    insights.push({
      type: 'achievement',
      title: 'Excellent Performance!',
      message: `Your average accuracy of ${user.globalStats.averageAccuracy}% is outstanding! Keep up the great work.`,
      actionable: false,
      priority: 'high',
      icon: '⭐',
      color: '#FFD700'
    });
  } else if (user.globalStats.averageAccuracy < 60) {
    insights.push({
      type: 'recommendation',
      title: 'Room for Improvement',
      message: `Consider reviewing concepts before answering questions to improve your accuracy of ${user.globalStats.averageAccuracy}%.`,
      actionable: true,
      priority: 'high',
      icon: '📚',
      color: '#3B82F6'
    });
    
    recommendations.push('Focus on understanding concepts rather than speed through questions.');
  }

  return { insights, weaknesses, strengths, recommendations };
}

function getDefaultIcon(type: AIInsight['type']): string {
  const icons: Record<AIInsight['type'], string> = {
    strength: '💪',
    weakness: '⚠️',
    recommendation: '🎯',
    motivation: '🚀',
    achievement: '⭐'
  };
  
  return icons[type] || '💡';
}

function handleInsightAction(insight: AIInsight): void {
  // Handle different types of insight actions
  switch (insight.type) {
    case 'weakness':
      console.log(`User wants to improve ${insight.subjectId}`);
      // Could navigate to subject-specific practice
      break;
    case 'recommendation':
      console.log(`User wants to act on: ${insight.title}`);
      // Could show tutorial or resource
      break;
    default:
      console.log(`Insight action: ${insight.title}`);
  }
}

// CSS-in-JS styles
const styles = `
  .dynamic-feedback {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .feedback-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .feedback-title {
    font-size: 28px;
    font-weight: bold;
    color: #1F2937;
    margin: 0 0 8px 0;
  }

  .feedback-subtitle {
    font-size: 16px;
    color: #6B7280;
    margin: 0;
  }

  .performance-overview {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 24px;
    margin-bottom: 32px;
  }

  .performance-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    color: white;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .card-icon {
    font-size: 24px;
  }

  .card-header h3 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-label {
    font-size: 14px;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    font-size: 18px;
    font-weight: bold;
  }

  .rank-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .subjects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .subject-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    border: 2px solid transparent;
    transition: all 0.3s ease;
  }

  .subject-item.weakest {
    border-color: #EF4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .subject-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .subject-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: white;
    margin-bottom: 12px;
  }

  .subject-info {
    text-align: center;
  }

  .subject-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #1F2937;
  }

  .subject-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .subject-stat {
    text-align: center;
  }

  .ai-insights, .recommendations, .recent-activity {
    background: rgba(249, 250, 251, 0.05);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .insights-header, .recommendations-header, .activity-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .insights-icon, .recommendations-icon, .activity-icon {
    font-size: 24px;
  }

  .insights-header h3, .recommendations-header h3, .activity-header h3 {
    font-size: 20px;
    font-weight: 600;
    color: #1F2937;
    margin: 0;
  }

  .insights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
  }

  .insight-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }

  .insight-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  .insight-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .insight-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .insight-title-area {
    flex: 1;
  }

  .insight-title {
    font-size: 16px;
    font-weight: 600;
    color: #1F2937;
    margin: 0 0 4px 0;
    line-height: 1.3;
  }

  .insight-priority {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .insight-priority.high {
    background: #FEE2E2;
    color: #991B1B;
  }

  .insight-priority.medium {
    background: #FEF3C7;
    color: #92400E;
  }

  .insight-priority.low {
    background: #F0FDF4;
    color: #0369A1;
  }

  .insight-content {
    color: #6B7280;
    line-height: 1.5;
  }

  .action-button {
    background: #3B82F6;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-button:hover {
    background: #2563EB;
    transform: translateY(-1px);
  }

  .recommendation-group {
    margin-bottom: 24px;
  }

  .group-title {
    font-size: 18px;
    font-weight: 600;
    color: #1F2937;
    margin-bottom: 16px;
  }

  .recommendation-list {
    display: grid;
    gap: 12px;
  }

  .recommendation-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
  }

  .recommendation-item.weakness {
    border-left: 4px solid #EF4444;
    background: rgba(239, 68, 68, 0.05);
  }

  .recommendation-item.strength {
    border-left: 4px solid #10B981;
    background: rgba(16, 185, 129, 0.05);
  }

  .recommendation-item:hover {
    transform: translateX(4px);
  }

  .recommendation-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .recommendation-text {
    flex: 1;
  }

  .recommendation-text strong {
    color: #1F2937;
    display: block;
    margin-bottom: 4px;
  }

  .recommendation-text p {
    margin: 0;
    color: #6B7280;
    font-size: 14px;
    line-height: 1.4;
  }

  .activity-timeline {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border-radius: 8px;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .activity-time {
    font-size: 12px;
    color: #6B7280;
    min-width: 60px;
  }

  .activity-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .activity-subject {
    font-size: 14px;
    font-weight: 600;
    color: #1F2937;
  }

  .activity-stats {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .activity-xp {
    background: #10B981;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
  }

  .activity-accuracy.high {
    background: #10B981;
    color: white;
  }

  .activity-accuracy.medium {
    background: #F59E0B;
    color: white;
  }

  .activity-accuracy.low {
    background: #EF4444;
    color: white;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

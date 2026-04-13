'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@/app/components/gamification/ProgressProvider';

interface AIRecommendation {
  focus_subject: string;
  reason: string;
  study_plan: string;
  motivation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number;
  estimated_duration: number;
  expected_xp: number;
  learning_objectives: string[];
  risk_factors: string[];
}

interface AICoachInterfaceProps {
  userId: string;
  onRecommendationAccept?: (recommendation: AIRecommendation) => void;
  onRecommendationReject?: (recommendation: AIRecommendation) => void;
  onFeedbackSubmit?: (feedback: any) => void;
}

/**
 * AI Coach Interface Component
 * Provides intelligent coaching recommendations with real-time updates
 */
export function AICoachInterface({
  userId,
  onRecommendationAccept,
  onRecommendationReject,
  onFeedbackSubmit
}: AICoachInterfaceProps) {
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ helpful: true, relevant: true, difficulty: 'just_right' as const, comments: '' });

  // Fetch AI recommendation
  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          options: {
            includeRecentActivity: true,
            activityDays: 7,
            includeAIHistory: true,
            historyDays: 30,
            includeBehaviorAnalysis: true,
            model: 'openai',
            temperature: 0.7,
            maxTokens: 800,
            useCache: true,
            personalizedPrompt: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI recommendation');
      }

      const data = await response.json();
      
      if (data.success) {
        setRecommendation(data.data.recommendation);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('AI Coach error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Handle recommendation acceptance
  const handleAccept = () => {
    if (recommendation && onRecommendationAccept) {
      onRecommendationAccept(recommendation);
      setShowFeedback(true);
    }
  };

  // Handle recommendation rejection
  const handleReject = () => {
    if (recommendation && onRecommendationReject) {
      onRecommendationReject(recommendation);
      setShowFeedback(true);
    }
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async () => {
    try {
      const response = await fetch('/api/ai/coach/feedback', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          memoryId: recommendation?.metadata?.memoryId,
          userAction: recommendation ? 'accepted' : 'rejected',
          actualOutcome: {
            subjectStudied: recommendation?.focus_subject,
            duration: recommendation?.estimated_duration,
            xpEarned: recommendation?.expected_xp,
            accuracy: 85, // Would come from actual performance
            satisfaction: 4,
            timestamp: new Date().toISOString()
          },
          feedback
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      const data = await response.json();
      
      if (data.success) {
        setShowFeedback(false);
        setFeedback({ helpful: true, relevant: true, difficulty: 'just_right', comments: '' });
        // Fetch new recommendation
        fetchRecommendation();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Feedback submission error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'hard': return '#EF4444';
      default: return '#6B7280';
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10B981';
    if (confidence >= 0.6) return '#F59E0B';
    if (confidence >= 0.4) return '#F97316';
    return '#EF4444';
  };

  useEffect(() => {
    fetchRecommendation();
  }, [userId]);

  if (loading) {
    return (
      <div className="ai-coach-interface loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">AI is analyzing your progress...</p>
          <p className="loading-subtext">Finding the perfect study plan for you</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-coach-interface error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">AI Coach Unavailable</h3>
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={fetchRecommendation}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-coach-interface">
      <AnimatePresence mode="wait">
        {recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="recommendation-container"
          >
            {/* Header */}
            <div className="recommendation-header">
              <div className="focus-badge">
                <span className="focus-subject">{recommendation.focus_subject}</span>
                <span className="focus-label">Today's Focus</span>
              </div>
              <div className="confidence-indicator">
                <span className="confidence-label">AI Confidence</span>
                <div 
                  className="confidence-bar"
                  style={{ 
                    backgroundColor: getConfidenceColor(recommendation.confidence),
                    width: `${recommendation.confidence * 100}%`
                  }}
                ></div>
                <span className="confidence-value">{Math.round(recommendation.confidence * 100)}%</span>
              </div>
            </div>

            {/* Main Content */}
            <div className="recommendation-content">
              {/* Study Plan */}
              <div className="study-plan-section">
                <h3 className="section-title">📚 Study Plan</h3>
                <p className="study-plan">{recommendation.study_plan}</p>
                <div className="plan-details">
                  <div className="detail-item">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{recommendation.estimated_duration} minutes</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Expected XP:</span>
                    <span className="detail-value">+{recommendation.expected_xp} XP</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Difficulty:</span>
                    <span 
                      className="difficulty-badge"
                      style={{ backgroundColor: getDifficultyColor(recommendation.difficulty) }}
                    >
                      {recommendation.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="reason-section">
                <h3 className="section-title">🧠 AI Analysis</h3>
                <p className="reason">{recommendation.reason}</p>
              </div>

              {/* Learning Objectives */}
              {recommendation.learning_objectives.length > 0 && (
                <div className="objectives-section">
                  <h3 className="section-title">🎯 Learning Objectives</h3>
                  <ul className="objectives-list">
                    {recommendation.learning_objectives.map((objective, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="objective-item"
                      >
                        {objective}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Factors */}
              {recommendation.risk_factors.length > 0 && (
                <div className="risks-section">
                  <h3 className="section-title">⚠️ Considerations</h3>
                  <ul className="risks-list">
                    {recommendation.risk_factors.map((risk, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="risk-item"
                      >
                        {risk}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Motivation */}
            <div className="motivation-section">
              <div className="motivation-content">
                <div className="motivation-icon">🔥</div>
                <p className="motivation-text">{recommendation.motivation}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="actions-section">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="accept-button"
                onClick={handleAccept}
              >
                Start Learning
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="reject-button"
                onClick={handleReject}
              >
                Choose Different
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedback && recommendation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="feedback-overlay"
          >
            <div className="feedback-modal">
              <div className="feedback-header">
                <h3>How was your study session?</h3>
                <button className="close-button" onClick={() => setShowFeedback(false)}>
                  ✕
                </button>
              </div>
              
              <div className="feedback-content">
                <div className="feedback-section">
                  <label className="feedback-label">Was this helpful?</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="helpful"
                        checked={feedback.helpful}
                        onChange={() => setFeedback({...feedback, helpful: true})}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="helpful"
                        checked={!feedback.helpful}
                        onChange={() => setFeedback({...feedback, helpful: false})}
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                <div className="feedback-section">
                  <label className="feedback-label">Was the difficulty right?</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="difficulty"
                        value="too_easy"
                        checked={feedback.difficulty === 'too_easy'}
                        onChange={() => setFeedback({...feedback, difficulty: 'too_easy'})}
                      />
                      <span>Too Easy</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="difficulty"
                        value="just_right"
                        checked={feedback.difficulty === 'just_right'}
                        onChange={() => setFeedback({...feedback, difficulty: 'just_right'})}
                      />
                      <span>Just Right</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="difficulty"
                        value="too_hard"
                        checked={feedback.difficulty === 'too_hard'}
                        onChange={() => setFeedback({...feedback, difficulty: 'too_hard'})}
                      />
                      <span>Too Hard</span>
                    </label>
                  </div>
                </div>

                <div className="feedback-section">
                  <label className="feedback-label">Additional Comments</label>
                  <textarea
                    className="feedback-textarea"
                    value={feedback.comments}
                    onChange={(e) => setFeedback({...feedback, comments: e.target.value})}
                    placeholder="Share your thoughts..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="feedback-actions">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="submit-feedback-button"
                  onClick={handleFeedbackSubmit}
                >
                  Submit Feedback
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styles */}
      <style jsx>{`
        .ai-coach-interface {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .loading-container {
          text-align: center;
          padding: 60px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          color: white;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .loading-subtext {
          font-size: 14px;
          opacity: 0.8;
          margin-top: 8px;
        }

        .error-container {
          text-align: center;
          padding: 40px 20px;
          background: #FEF2F2;
          border-radius: 16px;
          border: 1px solid #FCA5A5;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .error-title {
          color: #DC2626;
          margin: 0 0 16px 0;
        }

        .error-message {
          color: #7F1D1D;
          margin-bottom: 24px;
        }

        .retry-button {
          background: #3B82F6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .retry-button:hover {
          background: #2563EB;
        }

        .recommendation-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .recommendation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 24px 0;
          border-bottom: 1px solid #F3F4F6;
        }

        .focus-badge {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .focus-subject {
          font-size: 18px;
          font-weight: 700;
          color: #1F2937;
          text-transform: capitalize;
        }

        .focus-label {
          font-size: 12px;
          color: #6B7280;
          background: #F3F4F6;
          padding: 4px 8px;
          border-radius: 12px;
        }

        .confidence-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .confidence-label {
          font-size: 12px;
          color: #6B7280;
        }

        .confidence-bar {
          width: 60px;
          height: 8px;
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .confidence-value {
          font-size: 12px;
          font-weight: 600;
          color: #1F2937;
        }

        .recommendation-content {
          padding: 24px;
        }

        .study-plan-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1F2937;
          margin: 0 0 12px 0;
        }

        .study-plan {
          font-size: 18px;
          line-height: 1.6;
          color: #374151;
          margin-bottom: 16px;
        }

        .plan-details {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-label {
          font-size: 12px;
          color: #6B7280;
          font-weight: 500;
        }

        .detail-value {
          font-size: 14px;
          font-weight: 600;
          color: #1F2937;
        }

        .difficulty-badge {
          padding: 4px 8px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .reason-section {
          margin-bottom: 24px;
          padding: 16px;
          background: #F9FAFB;
          border-radius: 12px;
          border-left: 4px solid #3B82F6;
        }

        .reason {
          font-size: 14px;
          line-height: 1.5;
          color: #4B5563;
        }

        .objectives-section {
          margin-bottom: 24px;
        }

        .objectives-list {
          list-style: none;
          padding: 0;
        }

        .objective-item {
          padding: 8px 0 8px 16px;
          border-left: 2px solid #10B981;
          margin-bottom: 8px;
          position: relative;
        }

        .objective-item:before {
          content: '✓';
          position: absolute;
          left: -8px;
          color: #10B981;
          font-weight: bold;
        }

        .risks-section {
          margin-bottom: 24px;
        }

        .risks-list {
          list-style: none;
          padding: 0;
        }

        .risk-item {
          padding: 8px 0 8px 16px;
          border-left: 2px solid #F59E0B;
          margin-bottom: 8px;
          position: relative;
        }

        .risk-item:before {
          content: '⚠️';
          position: absolute;
          left: -8px;
          color: #F59E0B;
        }

        .motivation-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 24px;
          border-radius: 0 0 16px 16px;
          text-align: center;
        }

        .motivation-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .motivation-icon {
          font-size: 32px;
        }

        .motivation-text {
          font-size: 18px;
          font-weight: 600;
          color: white;
          line-height: 1.4;
        }

        .actions-section {
          display: flex;
          gap: 12px;
          padding: 24px;
          border-top: 1px solid #F3F4F6;
        }

        .accept-button, .reject-button {
          flex: 1;
          padding: 16px 24px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .accept-button {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
        }

        .accept-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }

        .reject-button {
          background: #F3F4F6;
          color: #6B7280;
          border: 2px solid #E5E7EB;
        }

        .reject-button:hover {
          background: #E5E7EB;
        }

        .feedback-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .feedback-modal {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .feedback-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6B7280;
        }

        .feedback-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .feedback-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .feedback-label {
          font-size: 14px;
          font-weight: 600;
          color: #1F2937;
        }

        .radio-group {
          display: flex;
          gap: 16px;
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .feedback-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
        }

        .submit-feedback-button {
          background: #3B82F6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .submit-feedback-button:hover {
          background: #2563EB;
        }

        @media (max-width: 768px) {
          .ai-coach-interface {
            padding: 16px;
          }
          
          .plan-details {
            flex-direction: column;
            gap: 8px;
          }
          
          .actions-section {
            flex-direction: column;
          }
          
          .feedback-modal {
            width: 95%;
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
}

export default AICoachInterface;

// Dynamic Components - Smart Loading for Bundle Optimization
* Only load what user sees in first 1 second

import dynamic from "next/dynamic";

// Loading skeleton component
export const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
  </div>
);

// AI Coach - Loaded on demand
export const AICoach = dynamic(() => import("../ai/AICoachInterface"), {
  loading: () => <SkeletonLoader />,
  ssr: false,
});

// Chaos Dashboard - Admin only
export const ChaosDashboard = dynamic(() => import("../debug/ChaosDashboard"), {
  loading: () => <SkeletonLoader />,
  ssr: false,
});

// Heavy Gamification Components
export const LevelUpModal = dynamic(() => import("../gamification/LevelUpModal"), {
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg p-4">Loading...</div>,
  ssr: false,
});

export const DynamicFeedback = dynamic(() => import("../gamification/DynamicFeedback"), {
  loading: () => <SkeletonLoader />,
  ssr: false,
});

export const OptimisticProgressBar = dynamic(() => import("../gamification/OptimisticProgressBar"), {
  loading: () => <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>,
  ssr: false,
});

// Analytics Components
export const AnalyticsDashboard = dynamic(() => import("../analytics/AnalyticsDashboard"), {
  loading: () => <SkeletonLoader />,
  ssr: false,
});

// Admin Components
export const DebugPanel = dynamic(() => import("../debug/DebugPanel"), {
  loading: () => <SkeletonLoader />,
  ssr: false,
});

// Subject-specific components
export const SubjectDetails = dynamic(() => import("../subjects/SubjectDetails"), {
  loading: () => (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
    </div>
  ),
  ssr: true, // Important for SEO
});

// Quiz Components
export const QuizInterface = dynamic(() => import("../quiz/QuizInterface"), {
  loading: () => (
    <div className="animate-pulse">
      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        ))}
      </div>
    </div>
  ),
  ssr: false,
});

// Performance monitoring
export const PerformanceMonitor = dynamic(() => import("../monitoring/PerformanceMonitor"), {
  loading: () => null, // Invisible loading
  ssr: false,
});

// Export all dynamic components
export default {
  AICoach,
  ChaosDashboard,
  LevelUpModal,
  DynamicFeedback,
  OptimisticProgressBar,
  AnalyticsDashboard,
  DebugPanel,
  SubjectDetails,
  QuizInterface,
  PerformanceMonitor,
  SkeletonLoader,
};

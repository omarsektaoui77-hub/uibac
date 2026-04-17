# Gamification System Specification

**Core Principle:**
Reward progress + consistency, not just activity.

**What We're Tracking:**
- Consistency (streaks)
- Effort (XP)
- Retention (learning quality)

---

## 1. XP Model (Effort + Difficulty + Quality)

### 1.1 Goal
Reward meaningful effort, not spam.

### 1.2 Base XP Formula

```
XP = Base × DifficultyMultiplier × AccuracyMultiplier × ConsistencyBonus
```

### 1.3 Components

**1. Base XP (per quiz)**
```typescript
BASE_XP = 10
```

**2. Difficulty Multiplier**
```typescript
enum Difficulty {
  EASY = 1.0,
  MEDIUM = 1.5,
  HARD = 2.0
}
```

**3. Accuracy Multiplier**
```typescript
function getAccuracyMultiplier(score: number): number {
  if (score >= 90) return 1.5;
  if (score >= 75) return 1.2;
  if (score >= 50) return 1.0;
  return 0.5; // Prevents farming XP with bad performance
}
```

**4. Consistency Bonus (Streak Boost)**
```typescript
function getStreakBonus(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.2;
  return 1.0;
}
```

### 1.4 Final Example

**User Scenario:**
- Hard quiz (Difficulty = 2.0)
- 85% score (Accuracy = 1.2)
- 10-day streak (Consistency = 1.2)

**Calculation:**
```
XP = 10 × 2.0 × 1.2 × 1.2 = 28.8 XP
```

### 1.5 Implementation

**Location:** `lib/gamification/xpCalculator.ts`

```typescript
export interface XPConfig {
  baseXP: number;
  difficulty: Difficulty;
  accuracy: number;
  streak: number;
}

export function calculateXP(config: XPConfig): number {
  const difficultyMultiplier = getDifficultyMultiplier(config.difficulty);
  const accuracyMultiplier = getAccuracyMultiplier(config.accuracy);
  const streakBonus = getStreakBonus(config.streak);

  return config.baseXP * difficultyMultiplier * accuracyMultiplier * streakBonus;
}

export enum Difficulty {
  EASY = 1.0,
  MEDIUM = 1.5,
  HARD = 2.0
}

function getDifficultyMultiplier(difficulty: Difficulty): number {
  return difficulty;
}

function getAccuracyMultiplier(score: number): number {
  if (score >= 90) return 1.5;
  if (score >= 75) return 1.2;
  if (score >= 50) return 1.0;
  return 0.5;
}

function getStreakBonus(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.2;
  return 1.0;
}
```

---

## 2. Streak Model (Consistency Engine)

### 2.1 Goal
Make users come back daily without burnout.

### 2.2 Definition

**A streak =** At least 1 meaningful action per day.

### 2.3 Valid Actions

Only count:
- `QUIZ_COMPLETED` with score ≥ 50%
- (Optional) `ENGAGEMENT_UPDATED` with time ≥ X minutes

**This avoids fake streaks.**

### 2.4 Streak Rules

**Continue streak:**
- User completes ≥1 valid action within 24h window

**Break streak:**
- No valid action for 24h+

### 2.5 Grace Period (CRITICAL UX TRICK)

Allow:
```typescript
const GRACE_WINDOW_HOURS = 6;
```

**If user misses deadline slightly → streak saved.**

### 2.6 Smart Reset Strategy (Advanced)

Instead of full reset:
```typescript
function calculateNewStreak(currentStreak: number): number {
  if (currentStreak > 7) {
    return Math.floor(currentStreak * 0.7); // Soft reset
  }
  return 0; // Full reset for new users
}
```

**Prevents rage-quitting.**

### 2.7 Implementation

**Location:** `lib/gamification/streakManager.ts`

```typescript
export interface StreakState {
  currentStreak: number;
  lastActionDate: string | null;
  graceWindowUsed: boolean;
}

export interface StreakUpdateResult {
  newStreak: number;
  streakContinued: boolean;
  streakReset: boolean;
  graceWindowUsed: boolean;
}

const GRACE_WINDOW_HOURS = 6;

export function updateStreak(
  currentState: StreakState,
  actionValid: boolean,
  actionDate: Date = new Date()
): StreakUpdateResult {
  if (!actionValid) {
    return {
      newStreak: currentState.currentStreak,
      streakContinued: false,
      streakReset: false,
      graceWindowUsed: false
    };
  }

  const now = actionDate;
  const lastAction = currentState.lastActionDate 
    ? new Date(currentState.lastActionDate) 
    : null;

  // First action ever
  if (!lastAction) {
    return {
      newStreak: 1,
      streakContinued: true,
      streakReset: false,
      graceWindowUsed: false
    };
  }

  const hoursSinceLastAction = (now.getTime() - lastAction.getTime()) / (1000 * 60 * 60);
  const hoursInDay = 24;

  // Within 24h window - continue streak
  if (hoursSinceLastAction <= hoursInDay) {
    return {
      newStreak: currentState.currentStreak + 1,
      streakContinued: true,
      streakReset: false,
      graceWindowUsed: false
    };
  }

  // Within grace window - save streak
  if (hoursSinceLastAction <= hoursInDay + GRACE_WINDOW_HOURS && !currentState.graceWindowUsed) {
    return {
      newStreak: currentState.currentStreak + 1,
      streakContinued: true,
      streakReset: false,
      graceWindowUsed: true
    };
  }

  // Streak broken - apply smart reset
  const newStreak = calculateNewStreak(currentState.currentStreak);
  return {
    newStreak,
    streakContinued: false,
    streakReset: true,
    graceWindowUsed: false
  };
}

function calculateNewStreak(currentStreak: number): number {
  if (currentStreak > 7) {
    return Math.floor(currentStreak * 0.7);
  }
  return 0;
}
```

---

## 3. Metrics That Actually Matter

### 3.1 Forget Vanity Metrics
**Don't track:**
- Total quizzes completed
- Total users
- Page views

### 3.2 Track These Instead

**1. Daily Active Learners (DAL)**
```typescript
DAL = unique_users_with_valid_action / day
```

**2. Streak Retention Rate**
```typescript
StreakRetentionRate = users_with_streak_≥_N_days / total_users
```

**This is your investor metric.**

**3. XP Velocity**
```typescript
XPVelocity = avg_XP_earned_per_user_per_day
```

**Measures engagement intensity.**

**4. Drop-off Point**
```typescript
DropOffPoint = day_where_users_break_streak (day 2? day 5? day 10?)
```

**This tells you where to optimize.**

### 3.3 Implementation

**Location:** `lib/gamification/metricsCalculator.ts`

```typescript
export interface UserMetrics {
  userId: string;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  dropOffDay: number | null;
}

export interface AggregateMetrics {
  dailyActiveLearners: number;
  streakRetentionRate: number;
  xpVelocity: number;
  dropOffDistribution: Record<number, number>; // day -> count
}

export function calculateMetrics(users: UserMetrics[]): AggregateMetrics {
  const totalUsers = users.length;
  const activeUsers = users.filter(u => {
    const lastActive = new Date(u.lastActiveDate);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return lastActive >= oneDayAgo;
  });

  const dailyActiveLearners = activeUsers.length / totalUsers;
  
  const usersWithStreak7 = users.filter(u => u.currentStreak >= 7).length;
  const streakRetentionRate = usersWithStreak7 / totalUsers;

  const totalXP = users.reduce((sum, u) => sum + u.totalXP, 0);
  const xpVelocity = totalXP / totalUsers;

  const dropOffDistribution: Record<number, number> = {};
  users.forEach(u => {
    if (u.dropOffDay) {
      dropOffDistribution[u.dropOffDay] = (dropOffDistribution[u.dropOffDay] || 0) + 1;
    }
  });

  return {
    dailyActiveLearners,
    streakRetentionRate,
    xpVelocity,
    dropOffDistribution
  };
}
```

---

## 4. Gamification Layers (What Users See)

### 4.1 Levels (Simple but Effective)

**Formula:**
```typescript
Level = Math.floor(Math.sqrt(totalXP / 10))
```

**Makes leveling progressively harder.**

### 4.2 Rewards

**Trigger:** `REWARD_GRANTED`

**Examples:**
- 7-day streak → badge
- 30-day streak → "elite" status
- XP milestones → unlock features

### 4.3 Visual Feedback (IMPORTANT)

**After every quiz, show:**
- XP gained (+28 XP)
- Streak status (🔥 Day 10)
- Progress to next level

**Immediate feedback = addiction loop.**

### 4.4 Implementation

**Location:** `lib/gamification/levelSystem.ts`

```typescript
export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 10));
}

export function getXPForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel + 1, 2) * 10;
}

export function getProgressToNextLevel(totalXP: number): number {
  const currentLevel = calculateLevel(totalXP);
  const currentLevelXP = Math.pow(currentLevel, 2) * 10;
  const nextLevelXP = Math.pow(currentLevel + 1, 2) * 10;
  
  return (totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP);
}
```

**Location:** `lib/gamification/rewardSystem.ts`

```typescript
export interface Reward {
  type: 'badge' | 'status' | 'feature_unlock' | 'xp_bonus';
  name: string;
  description: string;
  icon?: string;
}

export function checkRewardEligibility(streak: number, totalXP: number): Reward[] {
  const rewards: Reward[] = [];

  // Streak rewards
  if (streak === 7) {
    rewards.push({
      type: 'badge',
      name: 'Week Warrior',
      description: '7-day streak achieved!',
      icon: '🔥'
    });
  }

  if (streak === 30) {
    rewards.push({
      type: 'status',
      name: 'Elite Learner',
      description: '30-day streak achieved!',
      icon: '👑'
    });
  }

  // XP milestone rewards
  const level = calculateLevel(totalXP);
  if (level === 5) {
    rewards.push({
      type: 'feature_unlock',
      name: 'Advanced Topics',
      description: 'Unlock advanced quiz topics',
      icon: '🔓'
    });
  }

  return rewards;
}
```

---

## 5. Anti-Exploit System

### 5.1 If You Skip This, Your System Gets Gamed Fast

### 5.2 Detect XP Farming

**Flag if:**
- Too many quizzes in short time
- Low accuracy but high volume

### 5.3 Mitigation

```typescript
if (quizzes_per_hour > 10) {
  XP *= 0.5;
}
```

### 5.4 Cooldown System

```typescript
const MAX_XP_PER_HOUR = 200;
```

### 5.5 Implementation

**Location:** `lib/gamification/antiExploit.ts`

```typescript
export interface UserActivity {
  userId: string;
  quizzesLastHour: number;
  xpLastHour: number;
  lastQuizTime: number;
  averageAccuracyLastHour: number;
}

const MAX_QUIZZES_PER_HOUR = 10;
const MAX_XP_PER_HOUR = 200;
const MIN_ACCURITY_THRESHOLD = 50;

export function detectAndMitigateExploit(
  activity: UserActivity,
  calculatedXP: number
): { finalXP: number; exploitDetected: boolean; reason?: string } {
  let finalXP = calculatedXP;
  let exploitDetected = false;
  let reason: string | undefined;

  // Too many quizzes in short time
  if (activity.quizzesLastHour > MAX_QUIZZES_PER_HOUR) {
    finalXP *= 0.5;
    exploitDetected = true;
    reason = 'Too many quizzes in short time';
  }

  // XP cap per hour
  if (activity.xpLastHour + calculatedXP > MAX_XP_PER_HOUR) {
    finalXP = Math.min(finalXP, MAX_XP_PER_HOUR - activity.xpLastHour);
    exploitDetected = true;
    reason = 'XP cap per hour reached';
  }

  // Low accuracy farming
  if (activity.averageAccuracyLastHour < MIN_ACCURACY_THRESHOLD && activity.quizzesLastHour > 5) {
    finalXP *= 0.3;
    exploitDetected = true;
    reason = 'Low accuracy with high volume';
  }

  return { finalXP, exploitDetected, reason };
}
```

---

## 6. How This Fits Your Telemetry

### 6.1 You Already Track

- `QUIZ_COMPLETED`
- `STREAK_UPDATED`
- `REWARD_GRANTED`

### 6.2 Now Derive

**XP →** Computed on backend or edge
**Streak →** Updated per event
**Metrics →** Aggregated from KV / DB

### 6.3 Event Schema Integration

**Location:** `lib/telemetry/eventQueue.ts` (extend existing)

```typescript
interface TelemetryEvent {
  id: string;
  eventType: 'STREAK_UPDATED' | 'QUIZ_COMPLETED' | 'REWARD_GRANTED' | 'ENGAGEMENT_UPDATED';
  timestamp: number;
  serverTimestamp: number;
  sessionId: string;
  userId: string;
  payload: {
    // XP Model
    xpEarned?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    accuracy?: number;
    
    // Streak Model
    streak?: number;
    streakContinued?: boolean;
    streakReset?: boolean;
    graceWindowUsed?: boolean;
    
    // Rewards
    rewardType?: string;
    rewardValue?: number;
    
    // Engagement
    engagementScore?: number;
    timeSpent?: number;
    
    // Anti-Exploit
    exploitDetected?: boolean;
    exploitReason?: string;
    
    // Legacy (for backward compatibility)
    streakMultiplier?: number;
    level?: string;
    atRisk?: boolean;
    topic?: string;
  };
}
```

---

## 7. What to Show Your Investor

### 7.1 Don't Show Raw Data

**Don't show:**
- Total quizzes completed
- Total users
- Raw event counts

### 7.2 Show This Instead

**🔥 User Momentum Dashboard**
- Current streak (live)
- XP growth chart
- Retention curve (day 1 → day 7 → day 30)

### 7.3 Strategic Insight

**Most apps reward:**
- "activity"

**The best apps reward:**
- "progress + consistency"

**That's what creates habit loops.**

### 7.4 Dashboard Implementation

**Location:** `app/[locale]/dashboard/page.tsx`

```typescript
export default function InvestorDashboard() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">User Momentum Dashboard</h1>
      
      {/* Current Streak (Live) */}
      <div className="bg-gray-900 p-6 rounded-2xl mb-6">
        <h2 className="text-2xl font-bold mb-4">🔥 Current Streak (Live)</h2>
        <div className="text-6xl font-bold text-orange-500">Day 10</div>
      </div>
      
      {/* XP Growth Chart */}
      <div className="bg-gray-900 p-6 rounded-2xl mb-6">
        <h2 className="text-2xl font-bold mb-4">XP Growth Chart</h2>
        {/* Chart component showing XP over time */}
      </div>
      
      {/* Retention Curve */}
      <div className="bg-gray-900 p-6 rounded-2xl mb-6">
        <h2 className="text-2xl font-bold mb-4">Retention Curve</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-500">85%</div>
            <div className="text-gray-400">Day 1</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-500">72%</div>
            <div className="text-gray-400">Day 7</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-500">58%</div>
            <div className="text-gray-400">Day 30</div>
          </div>
        </div>
      </div>
      
      {/* Strategic Insight */}
      <div className="bg-gradient-to-r from-purple-900 to-pink-900 p-6 rounded-2xl">
        <h2 className="text-2xl font-bold mb-4">💡 Strategic Insight</h2>
        <p className="text-lg">
          Most apps reward <span className="font-bold text-yellow-400">"activity"</span>
        </p>
        <p className="text-lg">
          The best apps reward <span className="font-bold text-yellow-400">"progress + consistency"</span>
        </p>
        <p className="text-lg mt-4">
          That's what creates habit loops.
        </p>
      </div>
    </div>
  );
}
```

---

## 8. Integration with Existing Quiz Component

### 8.1 Update Quiz Results Screen

**Location:** `app/[locale]/quiz/page.tsx`

**After quiz completion:**
1. Calculate XP using new model
2. Update streak with grace period
3. Check for rewards
4. Show visual feedback
5. Track events to telemetry

### 8.2 Example Integration

```typescript
// In COMPLETE_QUIZ reducer case
case "COMPLETE_QUIZ":
  const accuracy = updatedState.correctAnswers / updatedState.questions.length * 100;
  
  // Calculate XP using new model
  const xpEarned = calculateXP({
    baseXP: 10,
    difficulty: Difficulty.MEDIUM,
    accuracy,
    streak: updatedState.streak
  });
  
  // Update streak with grace period
  const streakResult = updateStreak(
    {
      currentStreak: updatedState.streak,
      lastActionDate: updatedState.lastPlayedDate,
      graceWindowUsed: false
    },
    accuracy >= 50 // Valid action if accuracy >= 50%
  );
  
  // Check for rewards
  const rewards = checkRewardEligibility(streakResult.newStreak, updatedState.xp + xpEarned);
  
  // Anti-exploit check
  const antiExploitResult = detectAndMitigateExploit(
    userActivity,
    xpEarned
  );
  
  return {
    ...updatedState,
    xp: updatedState.xp + antiExploitResult.finalXP,
    streak: streakResult.newStreak,
    lastPlayedDate: new Date().toISOString(),
    reward: rewards.length > 0 ? rewards[0] : null,
    level: calculateLevel(updatedState.xp + antiExploitResult.finalXP)
  };
```

---

## 9. Implementation Order

1. **Phase 1:** XP Calculator (lib/gamification/xpCalculator.ts)
2. **Phase 2:** Streak Manager (lib/gamification/streakManager.ts)
3. **Phase 3:** Metrics Calculator (lib/gamification/metricsCalculator.ts)
4. **Phase 4:** Level System (lib/gamification/levelSystem.ts)
5. **Phase 5:** Reward System (lib/gamification/rewardSystem.ts)
6. **Phase 6:** Anti-Exploit System (lib/gamification/antiExploit.ts)
7. **Phase 7:** Update Quiz Component Integration
8. **Phase 8:** Update Telemetry Event Schema
9. **Phase 9:** Create Investor Dashboard
10. **Phase 10:** Testing & Validation

---

## 10. Success Criteria

**Functional:**
- ✅ XP rewards meaningful effort (not spam)
- ✅ Streaks require valid actions (not fake streaks)
- ✅ Grace period prevents rage-quitting
- ✅ Smart reset for long streaks
- ✅ Anti-exploit prevents farming
- ✅ Metrics track what actually matters

**User Experience:**
- ✅ Immediate visual feedback after every quiz
- ✅ Clear progress to next level
- ✅ Streak status visible and motivating
- ✅ Rewards feel earned (not random)

**Investor-Ready:**
- ✅ Dashboard shows momentum, not vanity metrics
- ✅ Retention curve demonstrates habit loop effectiveness
- ✅ XP velocity shows engagement intensity
- ✅ Drop-off points identify optimization opportunities

**Performance:**
- ✅ All calculations < 1ms
- ✅ No blocking operations
- ✅ Telemetry integration seamless

---

## Notes

**Core Philosophy:**
- Reward progress + consistency, not just activity
- This is what creates habit loops
- Most apps get this wrong

**Why This Works:**
- XP model prevents farming (accuracy multiplier)
- Streak model requires valid actions (score ≥ 50%)
- Grace period prevents burnout (6h window)
- Smart reset prevents rage-quitting (70% retention for long streaks)
- Anti-exploit protects system integrity

**Future Enhancements:**
- Dynamic difficulty based on XP velocity
- Social streaks (team challenges)
- Achievement badges beyond streaks
- Leaderboards based on XP velocity (not total XP)

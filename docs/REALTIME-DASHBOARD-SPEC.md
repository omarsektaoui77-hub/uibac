# Real-Time Dashboard Specification

**Goal:**
Build a real-time "User Momentum Dashboard" that shows engagement (XP), consistency (streaks), and retention (habit strength).

**Core Principle:**
Not raw logs. Live behavior signals.

---

## 1. UI Layout (High-Impact, Investor-Ready)

### 1.1 Top Section: "Live User State"

**Hero Cards (Real-time)**

**🔥 Current Streak**
- Large number display
- Fire emoji animation when increasing
- Shows streak freeze count if > 0

**⚡ Total XP**
- Large number display
- Lightning bolt animation when increasing
- Shows level progress

**📈 XP Today**
- Line mini-chart showing XP earned today
- Updates instantly after each event

**🎯 Quizzes Completed Today**
- Counter with increment animation
- Shows accuracy percentage

**These update instantly after each event.**

### 1.2 Middle Section: Behavior Trends

**A. XP Growth Chart (Real-time line chart)**
- X-axis: Time (last 24h)
- Y-axis: XP earned
- Updates every batch received
- Smooth animations (not jumpy)

**B. Streak Distribution (Histogram)**
- 1–3 days
- 4–7 days
- 7–14 days
- 30+ days

**Shows habit formation.**

**C. Retention Curve**
- % of users still active at:
  - Day 1
  - Day 3
  - Day 7
  - Day 14

**This is your investor killer metric.**

### 1.3 Bottom Section: System Health (SRE Layer)

**Metrics:**
- Events received / min
- Failed batches
- Retry rate
- Avg batch size

**Shows your system is not just "smart" but reliable.**

### 1.4 Implementation

**Location:** `app/[locale]/dashboard/page.tsx`

```typescript
"use client";

import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DashboardPage() {
  const { data: metrics, error } = useSWR('/api/metrics', fetcher, {
    refreshInterval: 3000, // Poll every 3 seconds
  });

  if (error) return <div>Error loading dashboard</div>;
  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">User Momentum Dashboard</h1>
      
      {/* Top Section: Live User State */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <HeroCard
          title="Current Streak"
          value={metrics.currentStreak}
          icon="🔥"
          animate={metrics.streakIncreased}
        />
        <HeroCard
          title="Total XP"
          value={metrics.totalXP}
          icon="⚡"
          animate={metrics.xpIncreased}
        />
        <HeroCard
          title="XP Today"
          value={metrics.xpToday}
          icon="📈"
          showChart
        />
        <HeroCard
          title="Quizzes Today"
          value={metrics.quizzesToday}
          icon="🎯"
          subtitle={`${metrics.accuracyToday}% accuracy`}
        />
      </div>
      
      {/* Middle Section: Behavior Trends */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-gray-900 p-6 rounded-2xl">
          <h2 className="text-2xl font-bold mb-4">XP Growth (Last 24h)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.xpGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Line type="monotone" dataKey="xp" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-gray-900 p-6 rounded-2xl">
          <h2 className="text-2xl font-bold mb-4">Streak Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.streakDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="range" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-gray-900 p-6 rounded-2xl mb-8">
        <h2 className="text-2xl font-bold mb-4">Retention Curve</h2>
        <div className="grid grid-cols-4 gap-4">
          {metrics.retentionCurve.map((point, index) => (
            <div key={index} className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-4xl font-bold text-green-500"
              >
                {point.percentage}%
              </motion.div>
              <div className="text-gray-400">Day {point.day}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom Section: System Health */}
      <div className="bg-gray-900 p-6 rounded-2xl">
        <h2 className="text-2xl font-bold mb-4">System Health</h2>
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="Events / min"
            value={metrics.systemHealth.eventsPerMin}
          />
          <MetricCard
            title="Failed Batches"
            value={metrics.systemHealth.failedBatches}
          />
          <MetricCard
            title="Retry Rate"
            value={`${metrics.systemHealth.retryRate}%`}
          />
          <MetricCard
            title="Avg Batch Size"
            value={metrics.systemHealth.avgBatchSize}
          />
        </div>
      </div>
    </div>
  );
}

function HeroCard({ title, value, icon, animate, showChart, subtitle }: any) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-gray-900 p-6 rounded-2xl"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400">{title}</h3>
        <motion.span
          animate={animate ? { scale: [1, 1.2, 1] } : {}}
          className="text-2xl"
        >
          {icon}
        </motion.span>
      </div>
      <motion.div
        key={value}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-4xl font-bold"
      >
        {value}
      </motion.div>
      {subtitle && <div className="text-sm text-gray-400 mt-2">{subtitle}</div>}
    </motion.div>
  );
}

function MetricCard({ title, value }: any) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-blue-400">{value}</div>
      <div className="text-gray-400">{title}</div>
    </div>
  );
}
```

---

## 2. Real-Time Data Flow

### 2.1 Flow Overview

```
Client (trackEvent)
   ↓
Batch Queue
   ↓
POST /api/telemetry (Edge)
   ↓
Vercel KV (buffer, TTL 48h)
   ↓
Aggregator Layer (cron or edge pull)
   ↓
Dashboard API (/api/metrics)
   ↓
Frontend (polling or streaming)
```

### 2.2 Key Design Decision

**OPTION A — Polling (Recommended for MVP)**

```typescript
// Frontend
const { data } = useSWR("/api/metrics", fetcher, {
  refreshInterval: 3000
});
```

**Pros:**
- Simple
- Stable
- Works on Vercel easily

**OPTION B — Streaming (Advanced)**

Server-Sent Events (SSE) or WebSockets
Push updates in real-time

**Cons:**
- Overkill for now

**Do this later.**

---

## 3. Metrics Aggregation Layer

### 3.1 Problem

You must NOT query raw KV every time → too slow + expensive.

### 3.2 Solution: Create Aggregated Keys

**Example:**
```
metrics:xp:today
metrics:streak:active
metrics:quiz:count:today
```

### 3.3 Update Strategy

**When Edge receives batch:**

Update aggregates immediately:

```typescript
// In edge handler
await kv.incr("metrics:xp:today", xpGained);
await kv.incr("metrics:quiz:count:today", 1);
```

**For charts:**

Store time buckets:
```
metrics:xp:hour:18
metrics:xp:hour:19
```

### 3.4 Implementation

**Location:** `lib/metrics/aggregator.ts`

```typescript
import { kv } from '@vercel/kv';

export interface AggregatedMetrics {
  xpToday: number;
  quizzesToday: number;
  currentStreak: number;
  streakDistribution: Record<string, number>;
  xpGrowth: Array<{ time: string; xp: number }>;
  retentionCurve: Array<{ day: number; percentage: number }>;
  systemHealth: {
    eventsPerMin: number;
    failedBatches: number;
    retryRate: number;
    avgBatchSize: number;
  };
}

export async function updateAggregates(event: TelemetryEvent): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  const day = now.toDateString();

  // Update daily aggregates
  await kv.incr(`metrics:xp:${day}`, event.payload.xpEarned || 0);
  await kv.incr(`metrics:quiz:count:${day}`, 1);

  // Update hourly aggregates for charts
  await kv.incr(`metrics:xp:hour:${hour}`, event.payload.xpEarned || 0);

  // Update streak distribution
  if (event.eventType === 'STREAK_UPDATED' && event.payload.streak) {
    const streak = event.payload.streak;
    const range = getStreakRange(streak);
    await kv.incr(`metrics:streak:${range}`, 1);
  }
}

function getStreakRange(streak: number): string {
  if (streak >= 30) return '30+';
  if (streak >= 14) return '14-30';
  if (streak >= 7) return '7-14';
  if (streak >= 4) return '4-7';
  return '1-3';
}

export async function getAggregatedMetrics(): Promise<AggregatedMetrics> {
  const today = new Date().toDateString();
  const now = new Date();
  
  // Get daily metrics
  const xpToday = (await kv.get(`metrics:xp:${today}`)) as number || 0;
  const quizzesToday = (await kv.get(`metrics:quiz:count:${today}`)) as number || 0;
  
  // Get streak distribution
  const streakRanges = ['1-3', '4-7', '7-14', '14-30', '30+'];
  const streakDistribution: Record<string, number> = [];
  
  for (const range of streakRanges) {
    streakDistribution[range] = (await kv.get(`metrics:streak:${range}`)) as number || 0;
  }
  
  // Get XP growth for last 24h
  const xpGrowth: Array<{ time: string; xp: number }> = [];
  for (let i = 0; i < 24; i++) {
    const hour = (now.getHours() - i + 24) % 24;
    const xp = (await kv.get(`metrics:xp:hour:${hour}`)) as number || 0;
    xpGrowth.unshift({ time: `${hour}:00`, xp });
  }
  
  // Get retention curve (this would be computed from user data)
  const retentionCurve = await computeRetentionCurve();
  
  // Get system health
  const systemHealth = await getSystemHealth();
  
  return {
    xpToday,
    quizzesToday,
    currentStreak: 0, // This would come from user state
    streakDistribution,
    xpGrowth,
    retentionCurve,
    systemHealth
  };
}

async function computeRetentionCurve(): Promise<Array<{ day: number; percentage: number }>> {
  // This would be computed from user data
  // For MVP, return mock data
  return [
    { day: 1, percentage: 85 },
    { day: 3, percentage: 72 },
    { day: 7, percentage: 58 },
    { day: 14, percentage: 45 }
  ];
}

async function getSystemHealth(): Promise<{
  eventsPerMin: number;
  failedBatches: number;
  retryRate: number;
  avgBatchSize: number;
}> {
  // This would be computed from telemetry logs
  // For MVP, return mock data
  return {
    eventsPerMin: 150,
    failedBatches: 2,
    retryRate: 1.5,
    avgBatchSize: 8
  };
}
```

---

## 4. Derived Metrics Logic

### 4.1 XP Today

```typescript
XP Today = sum(events where timestamp > today)
```

### 4.2 Current Streak

```typescript
Current Streak = lastActiveDate continuity check
```

### 4.3 Retention

```typescript
Retention = users active day N / users day 1
```

---

## 5. Frontend Components (Next.js)

### 5.1 Dependencies

```bash
npm install recharts swr framer-motion
```

### 5.2 Example Hook

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const { data } = useSWR("/api/metrics", fetcher, {
  refreshInterval: 3000
});
```

### 5.3 UI Behavior

- Numbers animate (XP ticking up)
- Streak glows 🔥 when increasing
- Charts update smoothly (not jumpy)

---

## 6. Metrics API Implementation

### 6.1 Dashboard API Endpoint

**Location:** `app/api/metrics/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getAggregatedMetrics } from '@/lib/metrics/aggregator';

export const runtime = 'edge';

export async function GET() {
  try {
    const metrics = await getAggregatedMetrics();
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 6.2 Update Telemetry Edge Handler

**Location:** `app/api/telemetry/route.ts` (update existing)

```typescript
import { updateAggregates } from '@/lib/metrics/aggregator';

// In POST handler, after deduplication:
for (const event of deduplicatedEvents) {
  await updateAggregates(event);
}
```

---

## 7. Common Mistakes (Avoid These)

❌ **Reading raw KV on every dashboard load**
- Too slow + expensive
- Solution: Use aggregated keys

❌ **No aggregation layer**
- Slow & expensive
- Solution: Create aggregated metrics

❌ **Updating UI per event**
- Causes lag
- Solution: Poll every 3 seconds

❌ **Showing too many metrics**
- Kills clarity
- Solution: Show only key metrics (streak, XP, retention)

---

## 8. What to Show the Investor

### 8.1 Demo Flow

1. Open dashboard
2. Trigger quiz
3. Instantly show:
   - XP increases ⚡
   - Streak updates 🔥
   - Chart moves 📈

### 8.2 Narrative

"This updates in real-time from our Edge telemetry pipeline."

**That's your moment.**

---

## 9. Local Testing Approach (Critical)

### 9.1 Run Full Stack Locally

- Next.js app
- Local API routes
- Mock KV (or Redis if available)

### 9.2 Create "Event Simulator"

**Location:** `scripts/event-simulator.ts`

```typescript
import { trackEvent } from '@/lib/telemetry/trackEvent';

setInterval(() => {
  trackEvent({
    eventType: 'QUIZ_COMPLETED',
    sessionId: 'test-session',
    userId: 'test-user',
    payload: {
      score: Math.random() * 100,
      xpEarned: Math.floor(Math.random() * 30) + 10,
      streak: Math.floor(Math.random() * 10) + 1
    }
  });
}, 500);
```

**Simulates real users.**

### 9.3 Stress Dashboard

**Test:**
1. Open dashboard
2. Run event simulator
3. Expect:
   - XP updates live
   - Charts move smoothly
   - No UI freezing

### 9.4 Simulate Edge Conditions

**A. Slow API**

```typescript
// In metrics API
await new Promise(r => setTimeout(r, 2000));
```

**Expect:**
- UI still responsive
- Data eventually updates

**B. Failure Injection**

```typescript
// Random 500 errors
if (Math.random() < 0.1) {
  throw new Error('Simulated failure');
}
```

**Expect:**
- Retry logic works
- No missing data

### 9.5 Data Consistency Test

**Test:**
1. Trigger 50 events
2. Verify:
   - XP matches expected
   - No duplicates
   - No missing increments

### 9.6 Memory & Performance

**Test:**
1. Open DevTools
2. Check FPS
3. Check memory growth

**Dashboard must stay smooth.**

---

## 10. Implementation Order

1. **Phase 1:** Metrics Aggregation Layer (lib/metrics/aggregator.ts)
2. **Phase 2:** Update Telemetry Edge Handler (add aggregate updates)
3. **Phase 3:** Dashboard API Endpoint (app/api/metrics/route.ts)
4. **Phase 4:** Frontend Components (app/[locale]/dashboard/page.tsx)
5. **Phase 5:** Install Dependencies (recharts, swr, framer-motion)
6. **Phase 6:** Event Simulator (scripts/event-simulator.ts)
7. **Phase 7:** Local Testing (stress test, edge conditions)
8. **Phase 8:** Performance Optimization (smooth animations)
9. **Phase 9:** Investor Demo Preparation
10. **Phase 10:** Deployment

---

## 11. Success Criteria

**Functional:**
- ✅ Dashboard updates in real-time (3s polling)
- ✅ Hero cards show live metrics
- ✅ Charts update smoothly
- ✅ System health metrics accurate

**Performance:**
- ✅ API response < 100ms
- ✅ Dashboard FPS > 60
- ✅ Memory usage stable
- ✅ No UI freezing

**Data Integrity:**
- ✅ Aggregates match raw events
- ✅ No duplicate counts
- ✅ No missing increments
- ✅ Retention curve accurate

**Investor-Ready:**
- ✅ Demo shows instant updates
- ✅ Metrics tell a clear story
- ✅ System health visible
- ✅ Narrative compelling

---

## Final Insight

**Telemetry = invisible system**
**Dashboard = perceived intelligence**

The dashboard is what makes your telemetry system visible and valuable to investors and stakeholders.

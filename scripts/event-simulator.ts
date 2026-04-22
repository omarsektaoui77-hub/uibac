// Event Simulator for Telemetry Testing
// Run this in the browser console to simulate 50 events

import { trackEvent } from '@/core/telemetry/trackEvent';
import { startPeriodicFlush, setupLifecycleFlush } from '@/core/telemetry/persistence';

// Initialize telemetry
startPeriodicFlush();
setupLifecycleFlush();

// Simulate 50 events
function simulateEvents() {
  console.log('[SIMULATOR] Starting 50 event simulation...');
  
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      trackEvent({
        eventType: 'QUIZ_COMPLETED',
        sessionId: `session-${Math.random().toString(36).substr(2, 9)}`,
        userId: 'test-user',
        payload: {
          score: Math.floor(Math.random() * 100),
          xpEarned: Math.floor(Math.random() * 30) + 10,
          streak: Math.floor(Math.random() * 10) + 1,
          accuracy: Math.random() * 100
        },
        metadata: {
          source: 'event-simulator',
          testRun: true
        }
      });
    }, i * 100); // 100ms between events
  }
  
  console.log('[SIMULATOR] 50 events queued');
}

// Run simulation
simulateEvents();

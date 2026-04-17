'use client';

import { useEffect } from 'react';
import { startAutoFlush, stopAutoFlush } from '@/lib/telemetry/autoFlush';
import { setupBeaconListener, removeBeaconListener } from '@/lib/telemetry/beacon';
import { DEBUG_TELEMETRY } from '@/lib/telemetry/eventQueue';

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize in browser
    if (typeof window === 'undefined') {
      return;
    }

    if (DEBUG_TELEMETRY) {
      console.log('[TELEMETRY] Initializing telemetry system');
    }

    // Start auto-flush (5000ms interval)
    startAutoFlush(5000);

    // Setup beacon listener for page unload
    setupBeaconListener();

    // Cleanup on unmount
    return () => {
      if (DEBUG_TELEMETRY) {
        console.log('[TELEMETRY] Cleaning up telemetry system');
      }
      
      stopAutoFlush();
      removeBeaconListener();
    };
  }, []);

  return <>{children}</>;
}

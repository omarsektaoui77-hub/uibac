"use client";

import { useEffect, useState } from 'react';
import { trackEvent } from '@/infra/telemetry/trackEvent';
import { startPeriodicFlush, setupLifecycleFlush, stopPeriodicFlush } from '@/infra/telemetry/persistence';
import { eventQueue } from '@/infra/telemetry/eventQueue';

export default function TelemetryTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  useEffect(() => {
    // Initialize telemetry
    startPeriodicFlush();
    setupLifecycleFlush();

    addLog('Telemetry initialized');

    return () => {
      stopPeriodicFlush();
    };
  }, []);

  const simulateEvents = async () => {
    setIsSimulating(true);
    addLog('Starting 50 event simulation...');

    for (let i = 0; i < 50; i++) {
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
          source: 'telemetry-test',
          testRun: true
        }
      });

      addLog(`Event ${i + 1}/50 queued (queue size: ${eventQueue.queue.length})`);

      // Small delay between events
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    addLog('50 events queued. Waiting for flushes...');

    // Wait for flushes to complete
    await new Promise(resolve => setTimeout(resolve, 10000));

    addLog('Simulation complete');
    setIsSimulating(false);
  };

  const checkTelemetryStatus = async () => {
    try {
      const response = await fetch('/api/telemetry');
      const data = await response.json();
      addLog(`Telemetry status: ${JSON.stringify(data)}`);
    } catch (error) {
      addLog(`Error checking telemetry: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Telemetry Test Page</h1>

      <div className="mb-8">
        <button
          onClick={simulateEvents}
          disabled={isSimulating}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-6 py-3 rounded-lg mr-4"
        >
          {isSimulating ? 'Simulating...' : 'Simulate 50 Events'}
        </button>

        <button
          onClick={checkTelemetryStatus}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg"
        >
          Check Telemetry Status
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Current Queue State</h2>
        <div className="bg-gray-900 p-4 rounded-lg">
          <p>Queue Size: {eventQueue.queue.length}</p>
          <p>Is Flushing: {eventQueue.isFlushing ? 'Yes' : 'No'}</p>
          <p>Last Flush: {eventQueue.lastFlushTime ? new Date(eventQueue.lastFlushTime).toISOString() : 'Never'}</p>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Logs</h2>
        <div className="bg-gray-900 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

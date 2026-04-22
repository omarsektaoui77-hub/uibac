"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getAllEvents,
  toggleNetworkFailure,
  SIMULATE_NETWORK_FAILURE,
  DEBUG_TELEMETRY,
} from "@/infra/telemetry/eventQueue";
import { flushEvents, flushAllRemaining } from "@/infra/telemetry/flush";
import type { TelemetryEvent } from "@/infra/telemetry/eventQueue";

export default function TelemetryDebugPage() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [stats, setStats] = useState({
    queued: 0,
    sending: 0,
    sent: 0,
    confirmed: 0,
    failed: 0,
    total: 0,
  });
  const [networkFailureEnabled, setNetworkFailureEnabled] = useState(SIMULATE_NETWORK_FAILURE);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Refresh event data
  const refreshData = useCallback(() => {
    const allEvents = getAllEvents();
    setEvents(allEvents);

    const counts = allEvents.reduce(
      (acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    setStats({
      queued: counts.queued || 0,
      sending: counts.sending || 0,
      sent: counts.sent || 0,
      confirmed: counts.confirmed || 0,
      failed: counts.failed || 0,
      total: allEvents.length,
    });

    setLastRefresh(new Date());
  }, []);

  // Auto-refresh
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 1000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Access global telemetry stats
  const getTelemetryStats = () => {
    if (typeof window !== "undefined" && (window as any).telemetryQueue) {
      return (window as any).telemetryQueue.stats;
    }
    return { confirmed: 0, failed: 0, sent: 0 };
  };

  const telemetryStats = getTelemetryStats();

  // Trigger test event
  const triggerTestEvent = () => {
    const { trackEvent } = require("@/infra/telemetry/trackEvent");
    trackEvent("QUIZ_COMPLETED", {
      score: Math.floor(Math.random() * 100),
      difficulty: "MEDIUM",
      accuracy: 0.85,
    });
    refreshData();
  };

  // Trigger multiple events
  const triggerBulkEvents = (count: number) => {
    const { trackEvent } = require("@/infra/telemetry/trackEvent");
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        trackEvent("ENGAGEMENT_UPDATED", {
          engagementScore: Math.random() * 100,
        });
      }, i * 50);
    }
    setTimeout(refreshData, count * 50 + 100);
  };

  // Toggle network failure
  const handleToggleNetworkFailure = () => {
    const newState = toggleNetworkFailure();
    setNetworkFailureEnabled(newState);
  };

  // Manual flush
  const handleFlush = async () => {
    console.log("[DEBUG] Manual flush triggered");
    await flushEvents();
    refreshData();
  };

  // Emergency flush (all remaining)
  const handleEmergencyFlush = async () => {
    console.log("[DEBUG] Emergency flush triggered");
    await flushAllRemaining();
    refreshData();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      queued: "#6b7280", // gray
      sending: "#3b82f6", // blue
      sent: "#f59e0b", // orange
      confirmed: "#10b981", // green
      failed: "#dc2626", // red
    };
    return colors[status] || "#6b7280";
  };

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif", maxWidth: "1400px", margin: "0 auto" }}>
      <h1>📊 Telemetry Lifecycle Debugger</h1>
      <p style={{ color: "#6b7280" }}>
        Real-time visibility into event lifecycle: queued → sending → sent → confirmed
      </p>

      {/* Status Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <StatusCard title="Queued" value={stats.queued} color="#6b7280" />
        <StatusCard title="Sending" value={stats.sending} color="#3b82f6" />
        <StatusCard title="Sent" value={stats.sent} color="#f59e0b" />
        <StatusCard title="Confirmed" value={stats.confirmed} color="#10b981" />
        <StatusCard title="Failed" value={stats.failed} color="#dc2626" />
        <StatusCard title="Total" value={stats.total} color="#000000" />
      </div>

      {/* Cumulative Stats */}
      <div
        style={{
          background: "#f3f4f6",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>📈 Cumulative Stats (Session)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>
              {telemetryStats.confirmed || 0}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Confirmed Lifetime</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc2626" }}>
              {telemetryStats.failed || 0}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Failed Lifetime</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#3b82f6" }}>
              {telemetryStats.sent || 0}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Unique Sent IDs</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          background: "#f9fafb",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0, marginRight: "20px" }}>🎮 Controls</h3>

        <button onClick={triggerTestEvent} style={{ padding: "8px 16px" }}>
          +1 Event
        </button>

        <button onClick={() => triggerBulkEvents(5)} style={{ padding: "8px 16px" }}>
          +5 Events
        </button>

        <button onClick={() => triggerBulkEvents(20)} style={{ padding: "8px 16px" }}>
          +20 Events
        </button>

        <div style={{ width: "1px", height: "30px", background: "#e5e7eb", margin: "0 10px" }} />

        <button onClick={handleFlush} style={{ padding: "8px 16px", background: "#3b82f6", color: "white" }}>
          Flush Queue
        </button>

        <button onClick={handleEmergencyFlush} style={{ padding: "8px 16px", background: "#f59e0b", color: "white" }}>
          Emergency Flush
        </button>

        <div style={{ width: "1px", height: "30px", background: "#e5e7eb", margin: "0 10px" }} />

        <button
          onClick={handleToggleNetworkFailure}
          style={{
            padding: "8px 16px",
            background: networkFailureEnabled ? "#dc2626" : "#10b981",
            color: "white",
          }}
        >
          {networkFailureEnabled ? "✗ Network Failing" : "✓ Network OK"}
        </button>

        <button onClick={refreshData} style={{ padding: "8px 16px" }}>
          Refresh
        </button>

        <span style={{ color: "#6b7280", fontSize: "12px", marginLeft: "auto" }}>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </span>
      </div>

      {/* Events Table */}
      <div style={{ overflowX: "auto" }}>
        <h2>📋 Event Queue ({events.length} events)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>ID</th>
              <th style={{ padding: "10px" }}>Type</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px" }}>Retries</th>
              <th style={{ padding: "10px" }}>Age</th>
              <th style={{ padding: "10px" }}>Payload</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>
                  No events in queue
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px", fontFamily: "monospace", fontSize: "12px" }}>
                    {event.id.substring(0, 8)}...
                  </td>
                  <td style={{ padding: "10px" }}>{event.eventType}</td>
                  <td style={{ padding: "10px" }}>
                    <span
                      style={{
                        background: getStatusColor(event.status),
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{event.retries}</td>
                  <td style={{ padding: "10px", fontSize: "12px" }}>
                    {Math.round((performance.now() - event.timestamp) / 1000)}s
                  </td>
                  <td style={{ padding: "10px", fontSize: "12px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {JSON.stringify(event.payload).substring(0, 50)}...
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Lifecycle Diagram */}
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          background: "#f9fafb",
          borderRadius: "8px",
        }}
      >
        <h3>🔄 Event Lifecycle</h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
            marginTop: "20px",
          }}
        >
          <LifecycleStep status="queued" count={stats.queued} label="queued" />
          <Arrow />
          <LifecycleStep status="sending" count={stats.sending} label="sending" />
          <Arrow />
          <LifecycleStep status="sent" count={stats.sent} label="sent" />
          <Arrow />
          <LifecycleStep status="confirmed" count={stats.confirmed} label="confirmed" />
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <Arrow direction="down" />
          <LifecycleStep status="failed" count={stats.failed} label="failed (→ retry)" />
        </div>
      </div>

      {/* Test Instructions */}
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          background: "#fef3c7",
          borderRadius: "8px",
          border: "2px solid #f59e0b",
        }}
      >
        <h3>🧪 Validation Tests</h3>
        <ul style={{ lineHeight: "1.8" }}>
          <li>
            <strong>Test 1 - Lifecycle:</strong> Click "+5 Events" → watch queued → sending → sent → confirmed
          </li>
          <li>
            <strong>Test 2 - Network Failure:</strong> Click "✗ Network Failing" → flush → watch failed → retry → confirmed
          </li>
          <li>
            <strong>Test 3 - Duplicate Detection:</strong> Note event IDs - same ID never sent twice
          </li>
          <li>
            <strong>Test 4 - Page Exit:</strong> Open DevTools → Network tab → close tab → check beacon request sent
          </li>
        </ul>
      </div>

      {/* Console Output */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "#1f2937",
          color: "#10b981",
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      >
        <h3 style={{ color: "white", marginTop: 0 }}>📟 Debug Console</h3>
        <p>Open browser console to see detailed telemetry logs</p>
        <code>
          window.telemetryQueue.printStatus() - Print current queue status
          <br />
          window.flushEvents() - Manually trigger flush
          <br />
          window.flushWithBeacon() - Trigger beacon flush
          <br />
          window.toggleNetworkFailure() - Toggle network failure simulation
        </code>
      </div>
    </div>
  );
}

function StatusCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div
      style={{
        padding: "15px",
        borderRadius: "8px",
        background: "white",
        border: `2px solid ${color}`,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px" }}>{title}</div>
      <div style={{ fontSize: "28px", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

function LifecycleStep({ status, count, label }: { status: string; count: number; label: string }) {
  const colors: Record<string, string> = {
    queued: "#6b7280",
    sending: "#3b82f6",
    sent: "#f59e0b",
    confirmed: "#10b981",
    failed: "#dc2626",
  };

  return (
    <div
      style={{
        padding: "15px 25px",
        borderRadius: "8px",
        background: colors[status] || "#6b7280",
        color: "white",
        textAlign: "center",
        minWidth: "100px",
        opacity: count > 0 ? 1 : 0.5,
      }}
    >
      <div style={{ fontSize: "24px", fontWeight: "bold" }}>{count}</div>
      <div style={{ fontSize: "12px", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function Arrow({ direction = "right" }: { direction?: "right" | "down" }) {
  const isDown = direction === "down";
  return (
    <div
      style={{
        width: isDown ? "2px" : "30px",
        height: isDown ? "30px" : "2px",
        background: "#9ca3af",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          [isDown ? "bottom" : "right"]: "-5px",
          [isDown ? "left" : "top"]: "50%",
          transform: isDown ? "translateX(-50%)" : "translateY(-50%)",
          width: "0",
          height: "0",
          borderLeft: isDown ? "5px solid transparent" : "5px solid #9ca3af",
          borderRight: isDown ? "5px solid transparent" : "5px solid transparent",
          borderTop: isDown ? "5px solid #9ca3af" : "none",
        }}
      />
    </div>
  );
}

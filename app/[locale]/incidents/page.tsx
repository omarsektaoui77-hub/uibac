"use client";

import { useEffect, useState } from "react";
import {
  getAllIncidents,
  getIncidentStats,
  acknowledgeIncident,
  resolveIncident,
  clearAllIncidents,
  Incident,
} from "@/lib/incident/incidentStore";

export default function IncidentsDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    critical: 0,
    bySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 },
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  function refreshData() {
    setIncidents(getAllIncidents());
    setStats(getIncidentStats());
    setLastUpdated(new Date());
  }

  function handleAcknowledge(id: string) {
    acknowledgeIncident(id);
    refreshData();
  }

  function handleResolve(id: string) {
    resolveIncident(id);
    refreshData();
  }

  function handleClearAll() {
    if (confirm("Clear all incidents?")) {
      clearAllIncidents();
      refreshData();
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case "CRITICAL":
        return "#dc2626"; // red
      case "WARNING":
        return "#f59e0b"; // orange
      case "INFO":
        return "#10b981"; // green
      default:
        return "#6b7280"; // gray
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, React.CSSProperties> = {
      OPEN: { background: "#fee2e2", color: "#dc2626" },
      ACKNOWLEDGED: { background: "#fef3c7", color: "#f59e0b" },
      RESOLVED: { background: "#d1fae5", color: "#10b981" },
    };

    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "bold",
          ...styles[status],
        }}
      >
        {status}
      </span>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h1>🚨 Incident Response Dashboard</h1>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <StatCard
          title="Total"
          value={stats.total}
          color="#3b82f6"
        />
        <StatCard
          title="Open"
          value={stats.open}
          color="#f59e0b"
        />
        <StatCard
          title="Critical"
          value={stats.critical}
          color="#dc2626"
        />
        <StatCard
          title="Warnings"
          value={stats.bySeverity.WARNING}
          color="#f59e0b"
        />
      </div>

      {/* Actions */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={refreshData} style={{ marginRight: "10px" }}>
          Refresh
        </button>
        <button onClick={handleClearAll} style={{ background: "#dc2626", color: "white" }}>
          Clear All
        </button>
        <span style={{ marginLeft: "10px", color: "#6b7280", fontSize: "12px" }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      {/* Incidents Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ padding: "10px", textAlign: "left" }}>ID</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Severity</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Status</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Title</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Environment</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Time</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>
                  No incidents recorded yet
                </td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <tr key={incident.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px", fontSize: "12px" }}>{incident.id}</td>
                  <td style={{ padding: "10px" }}>
                    <span
                      style={{
                        background: getSeverityColor(incident.severity),
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {incident.severity}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>{getStatusBadge(incident.status)}</td>
                  <td style={{ padding: "10px" }}>{incident.title}</td>
                  <td style={{ padding: "10px" }}>{incident.environment}</td>
                  <td style={{ padding: "10px", fontSize: "12px" }}>
                    {new Date(incident.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px" }}>
                    {incident.status === "OPEN" && (
                      <button
                        onClick={() => handleAcknowledge(incident.id)}
                        style={{ marginRight: "5px", fontSize: "12px" }}
                      >
                        Ack
                      </button>
                    )}
                    {incident.status !== "RESOLVED" && (
                      <button
                        onClick={() => handleResolve(incident.id)}
                        style={{ fontSize: "12px" }}
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Webhook Configuration */}
      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          background: "#f3f4f6",
          borderRadius: "8px",
        }}
      >
        <h3>🔗 Webhook Configuration</h3>
        <p>
          <strong>Endpoint:</strong> <code>http://localhost:3000/api/alerts</code>
        </p>
        <p>
          <strong>Method:</strong> POST
        </p>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          Configure this URL in Sentry Dashboard → Alerts → Actions
        </p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
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
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px" }}>
        {title}
      </div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

// Incident Store - In-memory storage for development
// In production, use Redis/Database for persistence

export type IncidentSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface Incident {
  id: string;
  sentryEventId?: string;
  sentryProject?: string;
  title: string;
  message?: string;
  severity: IncidentSeverity;
  environment: string;
  release?: string;
  culprit?: string;
  url?: string;
  timestamp: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  metadata?: {
    platform?: string;
    runtime?: string;
    userCount?: number;
  };
}

// In-memory store (use database in production)
export const incidents: Incident[] = [];

let incidentIdCounter = 0;

export function createIncident(data: Omit<Incident, "id" | "status">): Incident {
  const incident: Incident = {
    id: `INC-${Date.now()}-${++incidentIdCounter}`,
    status: "OPEN",
    ...data,
  };

  incidents.unshift(incident); // Add to beginning (newest first)

  console.log("[INCIDENT CREATED]", {
    id: incident.id,
    severity: incident.severity,
    title: incident.title,
    environment: incident.environment,
  });

  return incident;
}

export function getAllIncidents(): Incident[] {
  return [...incidents];
}

export function getIncidentsBySeverity(severity: IncidentSeverity): Incident[] {
  return incidents.filter((i) => i.severity === severity);
}

export function getOpenIncidents(): Incident[] {
  return incidents.filter((i) => i.status === "OPEN");
}

export function getCriticalIncidents(): Incident[] {
  return incidents.filter((i) => i.severity === "CRITICAL" && i.status === "OPEN");
}

export function acknowledgeIncident(id: string): Incident | null {
  const incident = incidents.find((i) => i.id === id);
  if (incident) {
    incident.status = "ACKNOWLEDGED";
    console.log("[INCIDENT ACKNOWLEDGED]", id);
  }
  return incident || null;
}

export function resolveIncident(id: string): Incident | null {
  const incident = incidents.find((i) => i.id === id);
  if (incident) {
    incident.status = "RESOLVED";
    console.log("[INCIDENT RESOLVED]", id);
  }
  return incident || null;
}

export function clearAllIncidents(): void {
  incidents.length = 0;
  console.log("[ALL INCIDENTS CLEARED]");
}

// Stats
export function getIncidentStats() {
  return {
    total: incidents.length,
    open: getOpenIncidents().length,
    critical: getCriticalIncidents().length,
    bySeverity: {
      CRITICAL: getIncidentsBySeverity("CRITICAL").length,
      WARNING: getIncidentsBySeverity("WARNING").length,
      INFO: getIncidentsBySeverity("INFO").length,
    },
  };
}

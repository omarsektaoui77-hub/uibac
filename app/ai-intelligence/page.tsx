'use client';

/**
 * AI Intelligence Dashboard
 * Real-time SRE operations center with AI-driven insights
 * 
 * Features:
 * - Live incident feed
 * - AI anomaly detection panel
 * - Stability score tracking
 * - Trend intelligence
 * - Real-time telemetry visualization
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  getDashboardIntelligence, 
  intelligenceBroadcast, 
  processTelemetryIntelligence,
  IntelligenceEvent,
  AIInsight 
} from '@/lib/sre/realtimeIntelligence';
import { 
  getRecentReports, 
  IncidentReport, 
  updateIncidentStatus,
  formatIncidentReport,
  exportReportsAsJSON,
  exportReportsAsMarkdown
} from '@/lib/sre/incidentReports';
import { AnomalyDetection } from '@/lib/sre/anomalyDetector';
import { TelemetryEvent, getAllEvents } from '@/lib/telemetry/eventQueue';

// Component imports would go here in a real Next.js app
// Using inline components for simplicity

export default function AIIntelligenceDashboard() {
  // State
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [stabilityScore, setStabilityScore] = useState(100);
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'degraded' | 'critical'>('healthy');
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([]);
  const [intelligenceEvents, setIntelligenceEvents] = useState<IntelligenceEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Initialize and subscribe to real-time updates
  useEffect(() => {
    // Load initial data
    refreshData();

    // Subscribe to all intelligence events
    const unsubscribe = intelligenceBroadcast.subscribeAll((event) => {
      setIntelligenceEvents(prev => [event, ...prev].slice(0, 100));
      
      // Update specific state based on event type
      switch (event.type) {
        case 'INCIDENT_CREATED':
          setIncidents(prev => [event.payload as IncidentReport, ...prev]);
          break;
        case 'ANOMALY_DETECTED':
          setAnomalies(prev => [event.payload as AnomalyDetection, ...prev].slice(0, 20));
          break;
        case 'INSIGHT_GENERATED':
          setInsights(prev => [event.payload as AIInsight, ...prev].slice(0, 10));
          break;
        case 'STABILITY_CHANGE':
          const update = event.payload as { currentScore: number };
          setStabilityScore(update.currentScore);
          break;
      }
      
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Refresh data from stores
  const refreshData = useCallback(() => {
    const intelligence = getDashboardIntelligence();
    setIncidents(intelligence.recentIncidents);
    setAnomalies(intelligence.activeAnomalies);
    setInsights(intelligence.aiInsights);
    setSystemHealth(intelligence.systemHealth.status);
    setStabilityScore(intelligence.systemHealth.stabilityScore);
    
    // Get telemetry events
    const events = getAllEvents ? getAllEvents() : [];
    setTelemetryEvents(events);
    
    setLastUpdate(new Date());
  }, []);

  // Start/stop AI monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      setIsMonitoring(false);
    } else {
      setIsMonitoring(true);
      // Trigger initial analysis
      const events = getAllEvents ? getAllEvents() : [];
      if (events.length > 0) {
        processTelemetryIntelligence(events);
      }
    }
  }, [isMonitoring]);

  // Manual trigger analysis
  const triggerAnalysis = useCallback(() => {
    const events = getAllEvents ? getAllEvents() : [];
    if (events.length > 0) {
      const result = processTelemetryIntelligence(events, { forceAnalysis: true });
      if (result.incident) {
        setSelectedIncident(result.incident);
      }
      refreshData();
    }
  }, [refreshData]);

  // Update incident status
  const handleStatusUpdate = useCallback((incidentId: string, status: 'investigating' | 'resolved' | 'closed') => {
    updateIncidentStatus(incidentId, status);
    refreshData();
  }, [refreshData]);

  // Export reports
  const handleExportJSON = useCallback(() => {
    const data = exportReportsAsJSON(incidents);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }, [incidents]);

  const handleExportMarkdown = useCallback(() => {
    const data = exportReportsAsMarkdown(incidents);
    const blob = new Blob([data], { type: 'text/markdown' };
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
  }, [incidents]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🤖 AI Intelligence Dashboard
        </h1>
        <p className="text-gray-600">
          Real-time SRE operations with AI-driven anomaly detection
        </p>
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={toggleMonitoring}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isMonitoring 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start AI Monitoring'}
          </button>
          <button
            onClick={triggerAnalysis}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Trigger Analysis
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Stability Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Stability Score</h3>
          <div className="flex items-center gap-4">
            <div 
              className={`text-4xl font-bold ${
                stabilityScore > 90 ? 'text-green-600' :
                stabilityScore > 70 ? 'text-yellow-600' :
                'text-red-600'
              }`}
            >
              {stabilityScore.toFixed(1)}%
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              systemHealth === 'healthy' ? 'bg-green-100 text-green-800' :
              systemHealth === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {systemHealth.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Active Anomalies */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Active Anomalies</h3>
          <div className="text-4xl font-bold text-orange-600">
            {anomalies.filter(a => a.detected).length}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {anomalies.filter(a => a.severity === 'critical').length} critical
          </p>
        </div>

        {/* Recent Incidents */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Recent Incidents</h3>
          <div className="text-4xl font-bold text-blue-600">
            {incidents.length}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {incidents.filter(i => i.status === 'detected').length} unresolved
          </p>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">AI Insights</h3>
          <div className="text-4xl font-bold text-purple-600">
            {insights.length}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {insights.filter(i => i.actionable).length} actionable
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Incident Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Feed */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                🚨 Live Incident Feed
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Export JSON
                </button>
                <button
                  onClick={handleExportMarkdown}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Export MD
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {incidents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No incidents detected. System is healthy.
                </div>
              ) : (
                incidents.map((incident) => (
                  <div 
                    key={incident.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {incident.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            incident.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {incident.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            AI Confidence: {(incident.ai_confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900">{incident.id}</h4>
                        <p className="text-sm text-gray-600 mt-1">{incident.summary}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>🕒 {new Date(incident.timestamp).toLocaleString()}</span>
                          <span>📊 Stability: {incident.telemetry_snapshot.stability_score.toFixed(0)}%</span>
                          <span>❌ Failures: {(incident.telemetry_snapshot.failure_rate * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      {incident.status === 'detected' && (
                        <div className="flex gap-1 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(incident.id, 'investigating');
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Investigate
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(incident.id, 'resolved');
                            }}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Insights Panel */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                💡 AI Insights
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {insights.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No AI insights available. Start monitoring to generate insights.
                </div>
              ) : (
                insights.map((insight, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${
                      insight.actionable 
                        ? 'border-purple-300 bg-purple-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            insight.category === 'performance' ? 'bg-blue-100 text-blue-800' :
                            insight.category === 'reliability' ? 'bg-green-100 text-green-800' :
                            insight.category === 'security' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {insight.category.toUpperCase()}
                          </span>
                          {insight.actionable && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              ACTIONABLE
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900">{insight.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                          {insight.suggestedAction && (
                            <span className="text-purple-600">
                              💡 {insight.suggestedAction}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Anomalies & Intelligence */}
        <div className="space-y-6">
          {/* Active Anomalies */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                🔴 Active Anomalies
              </h2>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {anomalies.filter(a => a.detected).length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No active anomalies detected.
                </div>
              ) : (
                anomalies.filter(a => a.detected).map((anomaly, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      anomaly.severity === 'critical' ? 'border-red-300 bg-red-50' :
                      anomaly.severity === 'high' ? 'border-orange-300 bg-orange-50' :
                      anomaly.severity === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{anomaly.type}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        anomaly.severity === 'critical' ? 'bg-red-200 text-red-900' :
                        anomaly.severity === 'high' ? 'bg-orange-200 text-orange-900' :
                        anomaly.severity === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                        'bg-green-200 text-green-900'
                      }`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{anomaly.reason}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        Confidence: {(anomaly.confidence * 100).toFixed(0)}%
                      </span>
                      <span className="text-gray-400">
                        {new Date(anomaly.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Trend Intelligence */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                📈 Trend Intelligence
              </h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Trend Direction</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    telemetryEvents.length > 0 && 
                    (telemetryEvents[0] as any)?.features?.trend_direction === 'improving'
                      ? 'bg-green-100 text-green-800' :
                    (telemetryEvents[0] as any)?.features?.trend_direction === 'degrading'
                      ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {telemetryEvents.length > 0 
                      ? (telemetryEvents[0] as any)?.features?.trend_direction || 'stable'
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pattern Deviation</span>
                  <span className="text-sm font-medium text-gray-900">
                    {telemetryEvents.length > 0 
                      ? ((telemetryEvents[0] as any)?.features?.pattern_deviation * 100).toFixed(1)
                      : '0.0'}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Burst Intensity</span>
                  <span className="text-sm font-medium text-gray-900">
                    {telemetryEvents.length > 0 
                      ? (telemetryEvents[0] as any)?.features?.burst_intensity?.toFixed(2)
                      : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Error Frequency</span>
                  <span className="text-sm font-medium text-gray-900">
                    {telemetryEvents.length > 0 
                      ? (telemetryEvents[0] as any)?.features?.error_frequency || 0
                      : 0} / 5min
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Intelligence Events */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                📡 Intelligence Stream
              </h2>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {intelligenceEvents.slice(0, 20).map((event, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 text-sm p-2 rounded hover:bg-gray-50"
                  >
                    <span className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      event.type === 'ANOMALY_DETECTED' ? 'bg-red-100 text-red-700' :
                      event.type === 'INCIDENT_CREATED' ? 'bg-orange-100 text-orange-700' :
                      event.type === 'INSIGHT_GENERATED' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {event.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-600">
                      {event.metadata.urgency}
                    </span>
                  </div>
                ))}
                {intelligenceEvents.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-4">
                    No events yet. Start monitoring to see the stream.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Incident {selectedIncident.id}
                </h2>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono text-gray-700">
                {formatIncidentReport(selectedIncident)}
              </pre>

              <div className="mt-6 flex gap-3">
                {selectedIncident.status === 'detected' && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedIncident.id, 'investigating');
                        setSelectedIncident(null);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Mark Investigating
                    </button>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedIncident.id, 'resolved');
                        setSelectedIncident(null);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Mark Resolved
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

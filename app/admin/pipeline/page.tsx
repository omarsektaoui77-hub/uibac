"use client";

import { useState } from "react";
import { branchData } from "../../lib/branchData";

export default function PipelineAdmin() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [language, setLanguage] = useState("en");
  const [forceRegenerate, setForceRegenerate] = useState(false);

  const allSubjects = [
    ...branchData.common.map(s => ({ ...s, track: 'common' })),
    ...branchData.SM.subjects.map(s => ({ ...s, track: 'sm' }))
  ];

  const triggerPipeline = async () => {
    if (!selectedTrack || !selectedSubject) {
      setError("Please select both track and subject");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await fetch("/api/pipeline/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: selectedTrack,
          subjectId: selectedSubject,
          language,
          forceRegenerate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Pipeline failed");
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (trackId: string, subjectId: string) => {
    try {
      const response = await fetch(`/api/pipeline/trigger?trackId=${trackId}&subjectId=${subjectId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { exists: false, cached: false, error: "Failed to check status" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Pipeline Administration</h1>

        {/* Pipeline Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Trigger Pipeline</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Track</label>
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Track</option>
                <option value="common">Common</option>
                <option value="sm">Mathematical Sciences</option>
                <option value="svt">SVT</option>
                <option value="pc">Physics/Chemistry</option>
                <option value="lettres">Letters</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={!selectedTrack}
              >
                <option value="">Select Subject</option>
                {allSubjects
                  .filter(s => selectedTrack === 'common' ? s.track === 'common' : s.track === selectedTrack)
                  .map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="forceRegenerate"
                checked={forceRegenerate}
                onChange={(e) => setForceRegenerate(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="forceRegenerate" className="text-sm">Force Regeneration</label>
            </div>
          </div>

          <button
            onClick={triggerPipeline}
            disabled={loading || !selectedTrack || !selectedSubject}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Trigger Pipeline"}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Pipeline Results</h2>
            <div className="bg-gray-50 p-4 rounded">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Status Overview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Question Bank Status</h2>
          <div className="space-y-2">
            {allSubjects.map(subject => (
              <SubjectStatusRow
                key={`${subject.track}-${subject.id}`}
                subject={subject}
                onStatusCheck={checkStatus}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubjectStatusRow({ subject, onStatusCheck }: { 
  subject: any; 
  onStatusCheck: (trackId: string, subjectId: string) => Promise<any>;
}) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const result = await onStatusCheck(subject.track, subject.id);
      setStatus(result);
    } catch (error) {
      setStatus({ exists: false, cached: false, error: "Failed to check" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border-b">
      <div>
        <span className="font-medium">{subject.name}</span>
        <span className="text-sm text-gray-500 ml-2">({subject.track})</span>
      </div>
      <div className="flex items-center gap-4">
        {status && (
          <div className="flex items-center gap-2 text-sm">
            {status.exists ? (
              <span className="text-green-600">Available</span>
            ) : (
              <span className="text-red-600">Not Generated</span>
            )}
            {status.cached && (
              <span className="text-blue-600">Cached</span>
            )}
          </div>
        )}
        <button
          onClick={checkStatus}
          disabled={loading}
          className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
        >
          {loading ? "Checking..." : "Check Status"}
        </button>
      </div>
    </div>
  );
}

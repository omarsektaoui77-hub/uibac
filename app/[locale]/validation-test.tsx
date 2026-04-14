"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { runProductionValidation, ValidationReport } from '../lib/testing/productionValidator';
import { logger } from '../lib/logging/logger';

export default function ValidationTestPage() {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const runValidation = async () => {
    setLoading(true);
    setError('');
    
    try {
      const validationReport = await runProductionValidation();
      setReport(validationReport);
    } catch (err) {
      console.error('Validation failed:', err);
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'fail': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'warning': return '⚠️';
      case 'fail': return '❌';
      default: return '❓';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Production Validation Suite
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive testing for BacQuest production readiness
          </p>
        </header>

        <div className="mb-8">
          <button
            onClick={runValidation}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Running Validation...' : 'Run Full Validation'}
          </button>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900 p-4 rounded-lg border border-red-200 dark:border-red-700">
            <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Validation Error</h3>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {report && (
          <div className="space-y-8">
            {/* Summary */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Validation Summary</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(report.summary.score)}`}>
                    {report.summary.score}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{report.summary.passed}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{report.summary.warnings}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{report.summary.failed}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <h3 className="font-semibold mb-2">Build Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Commit SHA:</strong> {report.buildInfo.commitSha.substring(0, 8)}</div>
                  <div><strong>Build Time:</strong> {new Date(report.buildInfo.buildTime).toLocaleString()}</div>
                  <div><strong>Environment:</strong> {report.buildInfo.environment}</div>
                  <div><strong>Version:</strong> {report.buildInfo.version}</div>
                </div>
              </div>
            </section>

            {/* Detailed Results */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Detailed Results</h2>
              
              <div className="space-y-4">
                {Object.entries(
                  report.results.reduce((acc, result) => {
                    if (!acc[result.category]) {
                      acc[result.category] = [];
                    }
                    acc[result.category].push(result);
                    return acc;
                  }, {} as Record<string, typeof report.results>)
                ).map(([category, tests]) => (
                  <div key={category} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                    <h3 className="font-semibold text-lg mb-3">{category}</h3>
                    
                    <div className="space-y-2">
                      {tests.map((test, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded"
                        >
                          <span className="text-lg">{getStatusIcon(test.status)}</span>
                          <div className="flex-1">
                            <div className="font-medium">{test.test}</div>
                            <div className={`text-sm ${getStatusColor(test.status)}`}>
                              {test.message}
                            </div>
                            {test.duration && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Duration: {test.duration.toFixed(2)}ms
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Export Results */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Export Results</h2>
              
              <div className="space-y-4">
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(report, null, 2)], {
                      type: 'application/json'
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `validation-report-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Download JSON Report
                </button>

                <button
                  onClick={() => {
                    const text = formatReportForConsole(report);
                    navigator.clipboard.writeText(text);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Copy to Clipboard
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function formatReportForConsole(report: ValidationReport): string {
  let text = `🚀 BacQuest Production Validation Report\n`;
  text += `Generated: ${new Date(report.timestamp).toLocaleString()}\n`;
  text += `Overall Score: ${report.summary.score}%\n`;
  text += `Passed: ${report.summary.passed}, Warnings: ${report.summary.warnings}, Failed: ${report.summary.failed}\n\n`;

  text += `Build Information:\n`;
  text += `  Commit SHA: ${report.buildInfo.commitSha}\n`;
  text += `  Build Time: ${report.buildInfo.buildTime}\n`;
  text += `  Environment: ${report.buildInfo.environment}\n`;
  text += `  Version: ${report.buildInfo.version}\n\n`;

  text += `Detailed Results:\n`;
  report.results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    text += `  ${icon} [${result.category}] ${result.test}: ${result.message}\n`;
    if (result.duration) {
      text += `    Duration: ${result.duration.toFixed(2)}ms\n`;
    }
  });

  return text;
}

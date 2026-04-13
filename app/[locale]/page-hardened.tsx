"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { getSubjects, getCommonSubjects, getSMSubjects, generateQuizLink } from "../lib/data/subjectsService";

// Force dynamic rendering to prevent build/deployment mismatches
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Loading skeleton component
function SubjectSkeleton() {
  return (
    <div className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="text-3xl mb-3 bg-gray-300 dark:bg-gray-600 rounded h-8 w-12"></div>
      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2 w-3/4"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
    </div>
  );
}

// Error boundary component
function ErrorBoundary({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = () => setHasError(true);
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return fallback;
  }

  return <>{children}</>;
}

// Subject card component with error handling
function SubjectCard({ subject, trackId }: { subject: any; trackId: string }) {
  const [imageError, setImageError] = useState(false);

  const handleError = () => {
    setImageError(true);
  };

  return (
    <Link
      href={generateQuizLink(useLocale(), trackId, subject.id)}
      className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
    >
      <div className="text-3xl mb-3">
        {imageError ? '?' : subject.icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{subject.name}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {trackId === 'common' 
          ? `Start practicing ${subject.name.toLowerCase()}` 
          : `Advanced ${subject.name.toLowerCase()} practice`
        }
      </p>
    </Link>
  );
}

// Subjects section component
function SubjectsSection({ title, subjects, trackId }: { 
  title: string; 
  subjects: any[]; 
  trackId: string; 
}) {
  if (!subjects || subjects.length === 0) {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">{title}</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900 p-6 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <p className="text-yellow-800 dark:text-yellow-200">
            {trackId === 'common' ? 'No common subjects available at the moment.' : 'No SM subjects available at the moment.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-6">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject, index) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <SubjectCard subject={subject} trackId={trackId} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// Main component
export default function HardenedHome() {
  const locale = useLocale();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Data loading states
  const [commonSubjects, setCommonSubjects] = useState<any[]>([]);
  const [smSubjects, setSmSubjects] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  // Load subjects data
  useEffect(() => {
    let mounted = true;

    async function loadSubjects() {
      try {
        setDataLoading(true);
        setDataError("");

        const [common, sm] = await Promise.all([
          getCommonSubjects(),
          getSMSubjects()
        ]);

        if (mounted) {
          setCommonSubjects(common);
          setSmSubjects(sm);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
        if (mounted) {
          setDataError("Failed to load subjects. Please refresh the page.");
        }
      } finally {
        if (mounted) {
          setDataLoading(false);
        }
      }
    }

    loadSubjects();

    return () => {
      mounted = false;
    };
  }, []);

  // AI Tutor functionality
  async function askAi() {
    setError("");
    setResponse("");
    
    if (!prompt.trim()) {
      setError("Please type a question first.");
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, lang: locale }),
      });
      
      const data = (await res.json()) as { response?: string; error?: string };
      
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Request failed");
        return;
      }
      
      setResponse(typeof data.response === "string" ? data.response : "");
    } catch (err) {
      console.error('AI request failed:', err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Retry data loading
  function retryDataLoad() {
    setDataError("");
    setDataLoading(true);
    
    // Trigger reload
    getCommonSubjects().then(setCommonSubjects).catch(() => {});
    getSMSubjects().then(setSmSubjects).catch(() => {});
    
    setTimeout(() => setDataLoading(false), 1000);
  }

  return (
    <ErrorBoundary
      fallback={
        <main className="text-foreground mx-auto max-w-4xl px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We're having trouble loading the page. Please try refreshing.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
          </div>
        </main>
      }
    >
      <main className="text-foreground mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">BacQuest</h1>
            <p className="mt-1 text-sm text-neutral-500">
              AI-Powered Moroccan Baccalaureate Learning Platform
            </p>
          </div>
          <Suspense fallback={<div>Loading language switcher...</div>}>
            <LanguageSwitcher />
          </Suspense>
        </header>

        {/* Data Loading State */}
        {dataLoading && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Loading Subjects...</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <SubjectSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {/* Data Error State */}
        {dataError && (
          <div className="mb-12 bg-red-50 dark:bg-red-900 p-6 rounded-lg border border-red-200 dark:border-red-700">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Loading Error
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">{dataError}</p>
            <button
              onClick={retryDataLoad}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        )}

        {/* Subjects Data */}
        {!dataLoading && !dataError && (
          <>
            <SubjectsSection 
              title="Common Subjects" 
              subjects={commonSubjects} 
              trackId="common" 
            />
            <SubjectsSection 
              title="Mathematical Sciences (SM)" 
              subjects={smSubjects} 
              trackId="sm" 
            />
          </>
        )}

        {/* AI Tutor Section */}
        <section className="mb-12 bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">AI Tutor</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="prompt">
                Ask the AI Tutor anything
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="bg-background w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Get help with any Moroccan Baccalaureate topic..."
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={askAi}
              disabled={loading}
              className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {loading ? "Thinking..." : "Ask AI Tutor"}
            </button>
          </div>

          {error ? (
            <div className="mt-4 bg-red-50 dark:bg-red-900 p-4 rounded-lg border border-red-200 dark:border-red-700">
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            </div>
          ) : null}

          {response ? (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-neutral-600 mb-2">AI Response</h3>
              <div className="whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                {response}
              </div>
            </div>
          ) : null}
        </section>

        {/* Pipeline Status */}
        <section className="text-center py-8">
          <h2 className="text-xl font-semibold mb-4">AI-Powered Learning Pipeline</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Our system automatically generates questions from real Moroccan Baccalaureate materials using AI
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <div className="px-4 py-2 bg-green-100 dark:bg-green-900 rounded-full text-sm">
              Google Drive Integration
            </div>
            <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">
              AI Content Analysis
            </div>
            <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900 rounded-full text-sm">
              Dynamic Question Generation
            </div>
          </div>
        </section>
      </main>
    </ErrorBoundary>
  );
}

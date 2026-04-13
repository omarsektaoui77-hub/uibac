"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { branchData } from "../lib/branchData";

export default function Home() {
  const locale = useLocale();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    } catch {
      setError("Network error. Is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  const generateQuizLink = (trackId: string, subjectId: string) => {
    return `/${locale}/quiz?trackId=${trackId}&subjectId=${subjectId}`;
  };

  return (
    <main className="text-foreground mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">BacQuest</h1>
          <p className="mt-1 text-sm text-neutral-500">
            AI-Powered Moroccan Baccalaureate Learning Platform
          </p>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Common Subjects */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Common Subjects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branchData.common.map((subject) => (
            <Link
              key={subject.id}
              href={generateQuizLink("common", subject.id)}
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="text-3xl mb-3">{subject.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{subject.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Start practicing {subject.name.toLowerCase()}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* SM Track */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Mathematical Sciences (SM)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branchData.SM.subjects.map((subject) => (
            <Link
              key={subject.id}
              href={generateQuizLink("sm", subject.id)}
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="text-3xl mb-3">{subject.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{subject.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Advanced {subject.name.toLowerCase()} practice</p>
            </Link>
          ))}
        </div>
      </section>

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
            />
          </div>
          <button
            type="button"
            onClick={askAi}
            disabled={loading}
            className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {loading ? "Loading..." : "Ask AI Tutor"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
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
  );
}

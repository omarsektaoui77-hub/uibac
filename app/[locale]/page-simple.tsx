"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useState, useEffect } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { branchData } from "../lib/branchData";

export default function SimplePage() {
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any>({ common: [], sm: [] });

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setSubjects({
        common: branchData.common || [],
        sm: branchData.SM?.subjects || []
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const generateQuizLink = (trackId: string, subjectId: string) => {
    return `/${locale}/quiz?trackId=${trackId}&subjectId=${subjectId}`;
  };

  if (loading) {
    return (
      <main className="text-foreground mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Loading...</h1>
          <p>Preparing your learning journey...</p>
        </div>
      </main>
    );
  }

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

      {/* Debug Info */}
      <div className="mb-8 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <p>Locale: {locale}</p>
        <p>Common Subjects: {subjects.common.length}</p>
        <p>SM Subjects: {subjects.sm.length}</p>
      </div>

      {/* Common Subjects */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Common Subjects</h2>
        {subjects.common.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.common.map((subject: any) => (
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
        ) : (
          <div className="bg-red-100 p-4 rounded">
            <p>No common subjects available</p>
          </div>
        )}
      </section>

      {/* SM Track */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Mathematical Sciences (SM)</h2>
        {subjects.sm.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.sm.map((subject: any) => (
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
        ) : (
          <div className="bg-red-100 p-4 rounded">
            <p>No SM subjects available</p>
          </div>
        )}
      </section>

      {/* Language Switcher Test */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Language Settings</h2>
        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
          <p className="mb-4">Current language: <strong>{locale}</strong></p>
          <LanguageSwitcher />
        </div>
      </section>
    </main>
  );
}

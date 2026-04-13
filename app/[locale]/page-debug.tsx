"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useState, useEffect } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { branchData } from "../lib/branchData";

export default function DebugPage() {
  const locale = useLocale();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDebugInfo({
      locale,
      branchDataKeys: Object.keys(branchData),
      commonSubjects: branchData.common?.length || 0,
      smSubjects: branchData.SM?.subjects?.length || 0,
      commonData: branchData.common,
      smData: branchData.SM?.subjects,
      timestamp: new Date().toISOString()
    });
  }, [locale]);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  const generateQuizLink = (trackId: string, subjectId: string) => {
    return `/${locale}/quiz?trackId=${trackId}&subjectId=${subjectId}`;
  };

  return (
    <main className="text-foreground mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">BacQuest - DEBUG MODE</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Debug version for navigator issues
          </p>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Debug Information */}
      <section className="mb-12 bg-red-50 dark:bg-red-900 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Debug Information</h2>
        <pre className="text-xs bg-black text-white p-4 rounded overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </section>

      {/* Common Subjects */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">
          Common Subjects ({branchData.common?.length || 0} items)
        </h2>
        {branchData.common && branchData.common.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchData.common.map((subject, index) => (
              <div
                key={subject.id}
                className="block p-6 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700"
              >
                <div className="text-3xl mb-3">{subject.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{subject.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  ID: {subject.id}
                </p>
                <Link
                  href={generateQuizLink("common", subject.id)}
                  className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Quiz Link
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-red-100 p-4 rounded">
            <p>No common subjects found!</p>
          </div>
        )}
      </section>

      {/* SM Track */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">
          Mathematical Sciences (SM) ({branchData.SM?.subjects?.length || 0} items)
        </h2>
        {branchData.SM?.subjects && branchData.SM.subjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchData.SM.subjects.map((subject, index) => (
              <div
                key={subject.id}
                className="block p-6 bg-green-50 dark:bg-green-900 rounded-lg border border-green-200 dark:border-green-700"
              >
                <div className="text-3xl mb-3">{subject.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{subject.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  ID: {subject.id}
                </p>
                <Link
                  href={generateQuizLink("sm", subject.id)}
                  className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Quiz Link
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-red-100 p-4 rounded">
            <p>No SM subjects found!</p>
          </div>
        )}
      </section>

      {/* Language Switcher Test */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Language Switcher Test</h2>
        <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
          <p>Current locale: <strong>{locale}</strong></p>
          <div className="mt-4">
            <LanguageSwitcher />
          </div>
        </div>
      </section>
    </main>
  );
}

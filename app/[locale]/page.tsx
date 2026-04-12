"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";

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

  return (
    <main className="text-foreground mx-auto max-w-lg px-4 py-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">UIBAC</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Current locale: <strong>{locale}</strong>
          </p>
        </div>
        <LanguageSwitcher />
      </header>

      <section className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="prompt">
          Your question
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="bg-background w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          placeholder="Ask the tutor anything…"
        />
        <button
          type="button"
          onClick={askAi}
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {loading ? "Loading…" : "Ask AI"}
        </button>
      </section>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {response ? (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-600">Response</h2>
          <div className="mt-2 whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            {response}
          </div>
        </section>
      ) : null}

      <p className="mt-10 text-sm">
        <Link
          href={`/${locale}/quiz`}
          className="text-neutral-600 underline dark:text-neutral-400"
        >
          Open quiz
        </Link>
      </p>
    </main>
  );
}

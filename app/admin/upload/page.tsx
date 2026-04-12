"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function AdminUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    setLog(["Uploading PDF to server..."]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      setLog((prev) => [...prev, "PDF parsed successfully. Commencing AI Analysis..."]);
      setStatus("analyzing");

      const data = await res.json();
      
      setLog((prev) => [...prev, `AI Generation Complete! ${data.questions.length} questions generated.`]);
      setResult(data);
      setStatus("done");
      
    } catch (error: any) {
      console.error(error);
      setLog((prev) => [...prev, `Error: ${error.message}`]);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">BacQuest Content Engine</h1>
        <p className="text-gray-400 mb-8">Phase 1 MVP: PDF to QA Pipeline</p>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <label className="block mb-4">
            <span className="text-gray-300 font-medium block mb-2">Upload Course PDF</span>
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-purple-600 file:text-white
                hover:file:bg-purple-700
                cursor-pointer"
            />
          </label>

          <button
            onClick={handleUpload}
            disabled={!file || status === "uploading" || status === "analyzing"}
            className={`w-full py-3 rounded-lg font-bold transition-all ${
              !file ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-[1.02]"
            }`}
          >
            {status === "uploading" ? "Uploading..." : status === "analyzing" ? "Analyzing with AI..." : "Extract & Generate"}
          </button>
        </div>

        {/* Live Logs */}
        {log.length > 0 && (
          <div className="mt-8 bg-black p-4 rounded-xl border border-gray-800 font-mono text-sm">
            <h3 className="text-gray-500 mb-2 uppercase tracking-widest text-xs">Pipeline Logs</h3>
            {log.map((line, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                key={i} 
                className={line.includes("Error") ? "text-red-400" : "text-green-400"}
              >
                &gt; {line}
              </motion.div>
            ))}
          </div>
        )}

        {/* Result Preview */}
        {result && status === "done" && (
          <div className="mt-6">
            <h3 className="text-xl font-bold mb-4 flex justify-between items-center">
              Generated Preview 
              <span className="text-sm bg-purple-500/20 text-purple-400 py-1 px-3 rounded-full">
                Saved to Firebase ✅
              </span>
            </h3>
            <div className="space-y-4">
              {result.questions.slice(0, 3).map((q: any, i: number) => (
                <div key={i} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <div className="flex gap-2 items-center mb-2">
                    <span className="bg-gray-700 px-2 py-1 rounded text-xs">{q.topic}</span>
                    <span className="bg-gray-700 px-2 py-1 rounded text-xs">⏱ {q.time_estimate}s</span>
                    <span className={`px-2 py-1 rounded text-xs ${q.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {q.difficulty}
                    </span>
                  </div>
                  <p className="font-bold mb-2">{q.question}</p>
                  <ul className="grid grid-cols-2 gap-2 text-sm">
                    {q.options.map((opt: string, j: number) => (
                      <li key={j} className={opt === q.correct_answer ? "text-green-400 font-bold" : "text-gray-400"}>
                        • {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {result.questions.length > 3 && (
                <div className="text-center text-gray-500 text-sm mt-4">
                  + {result.questions.length - 3} more questions in database
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";

function langInstruction(lang: string): string {
  switch (lang) {
    case "ar":
      return "You must answer in Moroccan Darija (colloquial Moroccan Arabic).";
    case "fr":
      return "You must answer in French.";
    case "esp":
    case "es":
      return "You must answer in Spanish.";
    default:
      return "You must answer in English.";
  }
}

async function callGroq(
  system: string,
  userPrompt: string
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key?.trim()) return null;

  const model =
    process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

async function callGemini(
  system: string,
  userPrompt: string
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

  const model =
    process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: userPrompt }] }],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() ?? null;
}

async function callOllama(
  system: string,
  userPrompt: string
): Promise<string | null> {
  const host = (
    process.env.OLLAMA_HOST || "http://127.0.0.1:11434"
  ).replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL?.trim() || "llama3.2";

  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content?.trim() ?? null;
}

function providerOrder(): string[] {
  const raw = process.env.AI_PROVIDER_ORDER || "groq,gemini,ollama";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt =
    typeof body === "object" &&
    body !== null &&
    "prompt" in body &&
    typeof (body as { prompt: unknown }).prompt === "string"
      ? (body as { prompt: string }).prompt
      : "";

  const lang =
    typeof body === "object" &&
    body !== null &&
    "lang" in body &&
    typeof (body as { lang: unknown }).lang === "string"
      ? (body as { lang: string }).lang
      : "en";

  if (!prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const system = `You are a helpful tutor for the UIBAC learning app. Be clear and concise. ${langInstruction(lang)}`;

  let response: string | null = null;

  for (const provider of providerOrder()) {
    try {
      if (provider === "groq") response = await callGroq(system, prompt);
      else if (provider === "gemini") response = await callGemini(system, prompt);
      else if (provider === "ollama") response = await callOllama(system, prompt);
    } catch {
      response = null;
    }
    if (response) break;
  }

  if (!response) {
    response = `Mock response: ${prompt}`;
  }

  return NextResponse.json({ response });
}

import { NextResponse } from "next/server";

/**
 * Proxies to an optional backend (e.g. local FastAPI).
 * Set INGEST_API_BASE_URL in .env.local (e.g. http://127.0.0.1:8000).
 * On Vercel, leave unset unless you deploy a public backend URL.
 */
export async function GET() {
  const base = process.env.INGEST_API_BASE_URL?.trim().replace(/\/$/, "");

  if (!base) {
    return NextResponse.json(
      {
        ok: false,
        devOnly: true,
        message:
          "INGEST_API_BASE_URL is not set. Configure it for local dev, or omit for production.",
      },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${base}/api/hello`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Upstream returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to reach ingest backend" },
      { status: 502 }
    );
  }
}

'use client';

export default function CrashTestPage() {
  // This will crash during render and test the global error boundary
  throw new Error("Render crash test - Global Error Boundary");
}

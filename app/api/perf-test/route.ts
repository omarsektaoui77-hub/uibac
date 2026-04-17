export async function GET() {
  // Simulate 1.2s latency for performance tracing
  await new Promise((resolve) => setTimeout(resolve, 1200));
  
  return Response.json({ 
    ok: true, 
    latency: "1200ms",
    timestamp: new Date().toISOString(),
  });
}

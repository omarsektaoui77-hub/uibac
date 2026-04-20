// Sentry test route - disabled since Sentry is temporarily removed
export async function GET() {
  return new Response("Sentry test route disabled", { status: 200 });
}

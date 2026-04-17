import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
export async function GET() {
  return Response.json({ status: "ok" });
}
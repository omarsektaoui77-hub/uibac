// @ts-nocheck - Supabase type inference issues with database schema
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { APILogger } from "@/lib/api-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  APILogger.logRequest(request);
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subject, score, answers, totalQuestions } = await request.json();
    
    const correctCount = answers.filter((a: any) => a.correct).length;
    
    const supabase = getSupabase();
    
    // Save quiz attempt
    // @ts-ignore - Supabase type inference issue
    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id: session.user.id,
        subject: subject,
        score: score,
        correct_count: correctCount,
        incorrect_count: totalQuestions - correctCount,
        completed_at: new Date().toISOString(),
      });
    
    if (error) throw error;
    
    // Update user's total score in profiles table
    const { data: userData } = await supabase
      .from("profiles")
      .select("total_score")
      .eq("id", session.user.id)
      .single();
    
    const newTotal = (userData?.total_score || 0) + score;
    
    await supabase
      .from("profiles")
      .update({ total_score: newTotal })
      .eq("id", session.user.id);
    
    APILogger.logSuccess(request, { userId: session.user.id, score });
    return NextResponse.json({ success: true, totalScore: newTotal });
  } catch (error) {
    APILogger.logError(error, request);
    console.error("Error saving attempt:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

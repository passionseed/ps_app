import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserPayload {
  userId: string;
  confirmDelete: boolean;
}

// Get user ID from JWT token
function getUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  try {
    const token = authHeader.substring(7);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    const requestingUserId = getUserIdFromToken(authHeader);
    
    if (!requestingUserId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    let body: DeleteUserPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify user can only delete their own account
    const targetUserId = body.userId;
    if (requestingUserId !== targetUserId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You can only delete your own account" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Require explicit confirmation
    if (!body.confirmDelete) {
      return new Response(
        JSON.stringify({ error: "Confirmation required to delete account" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Delete user data from all tables (in order to respect foreign keys)
    // Note: Order matters for foreign key constraints
    
    // 1. Delete hackathon-related data
    const { error: hackathonCommentsError } = await supabase
      .from("hackathon_comments")
      .delete()
      .eq("user_id", targetUserId);
    
    const { error: hackathonLikesError } = await supabase
      .from("hackathon_likes")
      .delete()
      .eq("user_id", targetUserId);
    
    const { error: hackathonPainPointError } = await supabase
      .from("hackathon_pain_point_feedback")
      .delete()
      .eq("participant_id", targetUserId);

    // 2. Delete hackathon sessions for this user
    const { data: participants } = await supabase
      .from("hackathon_participants")
      .select("id")
      .eq("email", targetUserId); // This won't work, we need user_id
    
    // Get participant ID from hackathon_participants if exists
    const { data: participantData } = await supabase
      .from("hackathon_participants")
      .select("id")
      .eq("auth_user_id", targetUserId);
    
    if (participantData && participantData.length > 0) {
      const participantId = participantData[0].id;
      
      await supabase
        .from("hackathon_sessions")
        .delete()
        .eq("participant_id", participantId);
      
      await supabase
        .from("hackathon_participants")
        .delete()
        .eq("id", participantId);
    }

    // 3. Delete profile and user data
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", targetUserId);

    // 4. Delete student interests
    const { error: interestsError } = await supabase
      .from("student_interests")
      .delete()
      .eq("user_id", targetUserId);

    // 5. Delete career goals
    const { error: careerGoalsError } = await supabase
      .from("student_career_goals")
      .delete()
      .eq("user_id", targetUserId);

    // 6. Delete student node progress
    const { error: nodeProgressError } = await supabase
      .from("student_node_progress")
      .delete()
      .eq("user_id", targetUserId);

    // 7. Delete path enrollments
    const { error: enrollmentsError } = await supabase
      .from("path_enrollments")
      .delete()
      .eq("user_id", targetUserId);

    // 8. Delete reflections
    const { error: reflectionsError } = await supabase
      .from("path_reflections")
      .delete()
      .eq("user_id", targetUserId);

    const { error: exitReflectionsError } = await supabase
      .from("path_exit_reflections")
      .delete()
      .eq("user_id", targetUserId);

    const { error: endReflectionsError } = await supabase
      .from("path_end_reflections")
      .delete()
      .eq("user_id", targetUserId);

    // 9. Delete ikigai reflections
    const { error: ikigaiError } = await supabase
      .from("ikigai_reflections")
      .delete()
      .eq("user_id", targetUserId);

    // 10. Delete user events
    const { error: eventsError } = await supabase
      .from("user_events")
      .delete()
      .eq("user_id", targetUserId);

    // 11. Delete portfolio items
    const { error: portfolioError } = await supabase
      .from("portfolio_items")
      .delete()
      .eq("user_id", targetUserId);

    // 12. Delete saved programs
    const { error: savedProgramsError } = await supabase
      .from("saved_programs")
      .delete()
      .eq("user_id", targetUserId);

    // 13. Delete score events
    const { error: scoreEventsError } = await supabase
      .from("score_events")
      .delete()
      .eq("user_id", targetUserId);

    // 14. Delete score timeline
    const { error: scoreTimelineError } = await supabase
      .from("score_timeline")
      .delete()
      .eq("user_id", targetUserId);

    // 15. Delete user sessions
    const { error: sessionsError } = await supabase
      .from("user_sessions")
      .delete()
      .eq("user_id", targetUserId);

    // 16. Finally delete the user from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(targetUserId);

    if (authError) {
      console.error("Failed to delete user from auth:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to delete user account", details: authError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[delete-user-account] Successfully deleted user ${targetUserId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account deleted successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );

  } catch (err) {
    console.error("delete-user-account error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

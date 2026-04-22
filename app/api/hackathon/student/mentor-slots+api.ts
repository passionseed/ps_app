import { corsHeaders, withCors } from "../../../../lib/apiCors";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 200, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mentorId = url.searchParams.get("mentor_id");
    const duration = url.searchParams.get("duration") ?? "30";

    if (!mentorId) {
      return Response.json(
        { error: "Missing mentor_id" },
        withCors({ status: 400 }, request)
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Not authenticated" },
        withCors({ status: 401 }, request)
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const res = await fetch(
      `https://www.passionseed.org/api/hackathon/student/mentor-slots?mentor_id=${mentorId}&duration=${duration}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json().catch(() => ({}));

    return Response.json(data, withCors({ status: res.status }, request));
  } catch (error) {
    console.error("[mentor-slots] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      withCors({ status: 500 }, request)
    );
  }
}

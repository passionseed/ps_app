import { corsHeaders, withCors } from "../../../../lib/apiCors";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 200, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mentor_id, slot_datetime, notes } = body;

    if (!mentor_id || !slot_datetime) {
      return Response.json(
        { error: "Missing required fields" },
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
      "https://www.passionseed.org/api/hackathon/student/book-mentor",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mentor_id, slot_datetime, notes }),
      }
    );

    const data = await res.json().catch(() => ({}));

    return Response.json(data, withCors({ status: res.status }, request));
  } catch (error) {
    console.error("[book-mentor] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      withCors({ status: 500 }, request)
    );
  }
}

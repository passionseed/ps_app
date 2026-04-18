import { readHackathonToken } from "../../../lib/hackathon-mode";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mentorId = url.searchParams.get("mentor_id");
    const duration = url.searchParams.get("duration") ?? "30";

    if (!mentorId) {
      return Response.json(
        { error: "Missing mentor_id" },
        { status: 400 }
      );
    }

    const token = await readHackathonToken();
    if (!token) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const res = await fetch(
      `https://www.passionseed.org/api/hackathon/student/mentor-slots?mentor_id=${mentorId}&duration=${duration}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json().catch(() => ({}));

    return Response.json(data, { status: res.status });
  } catch (error) {
    console.error("[mentor-slots] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

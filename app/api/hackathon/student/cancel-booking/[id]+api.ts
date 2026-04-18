export async function POST(request: Request, { id }: { id: string }) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const res = await fetch(
      `https://www.passionseed.org/api/hackathon/student/cancel-booking/${id}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json().catch(() => ({}));

    return Response.json(data, { status: res.status });
  } catch (error) {
    console.error("[cancel-booking] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

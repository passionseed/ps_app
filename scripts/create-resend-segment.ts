import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const RESEND_API_KEY = "REDACTED_RESEND_KEY";

async function createSegment() {
  const response = await fetch("https://api.resend.com/segments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "hackathon-healthcare" }),
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

createSegment();

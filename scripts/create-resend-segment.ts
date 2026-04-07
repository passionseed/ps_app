import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const RESEND_API_KEY = "re_P2hKXtZ7_5WFqwtTirN4jJGFmhiKF75pQ";

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

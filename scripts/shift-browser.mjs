// Run against a mock-origin Expo export and the isolated synthetic Postgres DB.
// Never use a deployed app or a production Supabase origin for this walkthrough.
import { chromium } from "playwright";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(
  new URL("../../pseed/package.json", import.meta.url),
);
const { Client } = require("pg");
const url = process.env.SHIFT_TEST_DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("An isolated local SHIFT test DB is required");
const db = new Client({ connectionString: url });
await db.connect();
const cid = (
  await db.query(
    "select id from shift_camp_cohorts where name='Synthetic SHIFT'",
  )
).rows[0].id;
const uid = "00000000-0000-0000-0000-000000000002";
await db.query("set role authenticated");
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
await db.query("select public.shift_camp_action($1,$2,$3)", [
  "introduction",
  cid,
  { language: "en", finished: true, step: 4 },
]);
const user = {
  id: uid,
  aud: "authenticated",
  role: "authenticated",
  email: "synthetic@example.invalid",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Synthetic Participant" },
  created_at: "2026-01-01T00:00:00Z",
};
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
await context.addInitScript(
  ({ uid, user, cid }) => {
    const enc = (v) =>
      btoa(JSON.stringify(v))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    const token = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: uid, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.test`;
    localStorage.setItem(
      "sb-shift-auth-token",
      JSON.stringify({
        access_token: token,
        refresh_token: "test",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user,
      }),
    );
    localStorage.setItem(`shift-cohort:${uid}`, cid);
  },
  { uid, user, cid },
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let failNextSave = false;
await page.route("https://shift.test/**", async (route) => {
  const req = route.request();
  if (req.url().includes("/auth/v1/")) return route.fulfill({ json: user });
  if (req.url().includes("/rpc/shift_camp_action")) {
    const p = req.postDataJSON();
    if (failNextSave && p.p_action === "save_update") {
      failNextSave = false;
      return route.fulfill({
        status: 400,
        json: { message: "Synthetic save failure. Try again.", code: "P0001" },
      });
    }
    try {
      const data = (
        await db.query("select public.shift_camp_action($1,$2,$3) result", [
          p.p_action,
          p.p_cohort_id,
          p.p_payload,
        ])
      ).rows[0].result;
      return route.fulfill({ json: data });
    } catch (e) {
      return route.fulfill({
        status: 400,
        json: { message: e.message, code: e.code },
      });
    }
  }
  return route.fulfill({ json: [] });
});
await page.goto(process.env.SHIFT_PREVIEW_URL ?? "http://127.0.0.1:8876");
await page
  .getByText("MY CURRENT FOCUS", { exact: true })
  .waitFor({ timeout: 30000 })
  .catch(async (e) => {
    await page.screenshot({ path: "/tmp/shift-browser-failure.png" });
    console.log("PAGE", await page.locator("body").innerText());
    console.log("ERRORS", errors);
    throw e;
  });
await page.screenshot({ path: "/tmp/shift-today.png", fullPage: true });
await page.getByText("My Group", { exact: true }).last().click();
await page.getByText("Group conversation", { exact: true }).waitFor();
const groupMessage = `Can someone test my next version? ${Date.now()}`;
await page.getByLabel("Say hello, ask, or share").fill(groupMessage);
await page.getByRole("button", { name: "Send to group", exact: true }).click();
await page.waitForFunction(
  () =>
    document.querySelector('textarea[aria-label="Say hello, ask, or share"]')
      ?.value === "",
);
await page.getByText(groupMessage, { exact: true }).waitFor();
await page.getByText("Today", { exact: true }).last().click();
await page.getByRole("button", { name: "3", exact: true }).click();
await page
  .getByRole("button", { name: "Share a short update", exact: true })
  .click();
await page
  .getByLabel("What did you try or ship?")
  .fill("A prototype posted from the app");
await page
  .getByLabel("What did you learn?")
  .fill("Specific requests get better feedback");
failNextSave = true;
const publishButton = page.getByRole("button", {
  name: /^(Post to cohort|Save presentation changes)$/,
});
await publishButton.click();
await page
  .getByText("Synthetic save failure. Try again.", { exact: true })
  .waitFor();
assert.equal(
  await page.getByLabel("What did you try or ship?").inputValue(),
  "A prototype posted from the app",
  "Failed save retains the draft",
);
await publishButton.click();
await page
  .getByText(
    "Real work, unfinished attempts, and things we learned. This space is only for your cohort and mentors.",
    { exact: true },
  )
  .waitFor();
await page
  .getByText("A prototype posted from the app", { exact: true })
  .waitFor();
await page.screenshot({ path: "/tmp/shift-projects.png", fullPage: true });
const rows = (
  await db.query(
    "select count(*) from shift_camp_updates where cohort_id=$1 and day=3 and published_at is not null",
    [cid],
  )
).rows;
assert.equal(rows[0].count, "1");
assert.deepEqual(errors, []);
await browser.close();
await db.end();
console.log(
  "PASS: mobile-sized browser camp navigation, group messaging, presentation publishing, save-failure recovery, and no runtime errors",
);

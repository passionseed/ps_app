import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(__dirname, "..", path), "utf8");

const landingSource = read("app/index.tsx");
const signInSource = read("app/sign-in.tsx");
const panelSource = read("components/round/SignInPanel.tsx");
const glassCardSource = read("components/Glass/GlassCard.tsx");

describe("signed-out welcome (DESIGN.md v4)", () => {
  it("shares the orb hero and sign-in actions with /sign-in", () => {
    for (const source of [landingSource, signInSource]) {
      expect(source).toContain("<WelcomeHero />");
      expect(source).toContain("<SignInPanel");
      expect(source).toContain("<RoundShell");
    }
  });

  it("keeps a way in without an account and lands guests on Home", () => {
    expect(landingSource).toContain("enterAsGuest()");
    expect(landingSource).toContain('router.replace("/(tabs)/shift")');
  });

  it("uses the native Apple button on iOS and the Google Pillow", () => {
    expect(panelSource).toContain("AppleAuthenticationButton");
    expect(panelSource).toContain('icon="google"');
    expect(panelSource).toContain("<PillowButton");
  });

  it("has no retired neon accents or emoji icons", () => {
    for (const source of [landingSource, signInSource, panelSource]) {
      expect(source).not.toMatch(/#BFFF00/i);
      expect(source).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe("legacy glass card (PathLab screens)", () => {
  it("lets content overlap the card while preserving the full card outline", () => {
    expect(glassCardSource).toContain('overflow: "visible"');
    expect(glassCardSource).toContain("styles.surface");
    expect(glassCardSource).toContain("styles.borderOverlay");
    expect(glassCardSource).toContain('overflow: "hidden"');
  });
});

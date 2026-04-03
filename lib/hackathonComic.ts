import type {
  HackathonComicContent,
  HackathonComicPanel,
  HackathonComicPanelMetadata,
} from "../types/hackathon-phase-activity";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function firstString(values: Array<unknown>, fallback: string): string {
  for (const value of values) {
    const resolved = toStringValue(value);
    if (resolved) return resolved;
  }

  return fallback;
}

function normalizePanel(
  panel: HackathonComicPanelMetadata,
  index: number,
  contentTitle: string,
  contentBody: string,
): HackathonComicPanel {
  const fallbackHeadline = `Panel ${index + 1}`;
  const fallbackBody = contentBody.trim();

  return {
    id: toStringValue(panel.id) ?? `panel-${index + 1}`,
    order: toNumberValue(panel.order ?? panel.display_order) ?? index + 1,
    headline: firstString(
      [panel.headline, panel.title, panel.label, contentTitle],
      fallbackHeadline,
    ),
    body: firstString([panel.body, panel.description, contentBody], fallbackBody),
    imageKey:
      toStringValue(panel.image_key) ??
      toStringValue(panel.imageKey) ??
      toStringValue(panel.image_url) ??
      toStringValue(panel.imageUrl),
    accent: toStringValue(panel.accent) ?? toStringValue(panel.tone) ?? "cyan",
  };
}

export function parseHackathonComicContent(
  metadata: unknown,
  contentTitle: string,
  contentBody: string,
): HackathonComicContent | null {
  if (!isRecord(metadata)) {
    return null;
  }

  const panels = metadata.panels;
  if (!Array.isArray(panels) || panels.length === 0) {
    return null;
  }

  const normalizedPanels = panels
    .filter(isRecord)
    .map((panel, index) =>
      normalizePanel(
        panel as HackathonComicPanelMetadata,
        index,
        contentTitle,
        contentBody,
      ),
    )
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));

  if (normalizedPanels.length === 0) {
    return null;
  }

  return {
    variant: toStringValue(metadata.variant) ?? "evidence_first",
    panels: normalizedPanels,
  };
}

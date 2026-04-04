type HackathonComicPanelPhaseInput = {
  scrollY: number;
  panelTop: number;
  panelHeight: number;
  viewportHeight: number;
};

export function getHackathonComicPanelPhase({
  scrollY,
  panelTop,
  panelHeight,
  viewportHeight,
}: HackathonComicPanelPhaseInput): number {
  "worklet";

  const panelCenter = panelTop + panelHeight / 2;
  const viewportCenter = scrollY + viewportHeight / 2;
  const normalizer = Math.max(viewportHeight * 0.75, 1);

  return (panelCenter - viewportCenter) / normalizer;
}

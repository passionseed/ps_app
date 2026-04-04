export function getHackathonActivityHref(nodeId: string) {
  return {
    pathname: "/(hackathon)/activity/[nodeId]" as const,
    params: { nodeId },
  };
}

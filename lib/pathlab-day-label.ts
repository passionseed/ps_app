export function formatPathDayLabel(
  dayNumber: number,
  title?: string | null,
): string {
  const trimmedTitle = title?.trim();

  return trimmedTitle ? `Day ${dayNumber}: ${trimmedTitle}` : `Day ${dayNumber}`;
}

export function formatPathDayCompletionLabel(
  dayNumber: number,
  title?: string | null,
): string {
  return `${formatPathDayLabel(dayNumber, title)} Complete! 🎉`;
}

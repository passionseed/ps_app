// lib/hackathon-emoji.ts
// Seeded random emoji generator for hackathon team emojis

// Emoji pools: animals, food, objects (75 total)
const ANIMAL_EMOJIS = [
  "🦁", "🐼", "🦊", "🐯", "🦓", "🐸", "🐵", "🦄", "🐲", "🐨",
  "🐷", "🐔", "🐧", "🦅", "🦉", "🦆", "🦜", "🦢", "🦚", "🐝",
  "🐞", "🐢", "🐙", "🦋", "🦈"
];

const FOOD_EMOJIS = [
  "🍕", "🍜", "🍰", "🍔", "🍟", "🌮", "🍣", "🍩", "🍪", "🧁",
  "🍫", "🍿", "🥑", "🍓", "🍒", "🍑", "🍍", "🥝", "🧀", "🥐",
  "🥨", "🍭", "🍮", "🧋", "🧊"
];

const OBJECT_EMOJIS = [
  "⚽", "🎸", "🎨", "🎯", "🎲", "🎪", "🎭", "🎬", "🎤", "🎧",
  "🎹", "🎺", "🎻", "🥁", "🏀", "🏈", "🎾", "🏐", "🎿", "🏂",
  "🏊", "🚴", "🎢", "🎡", "🎠"
];

const ALL_EMOJIS = [...ANIMAL_EMOJIS, ...FOOD_EMOJIS, ...OBJECT_EMOJIS];

/**
 * Simple seeded random number generator using hash-based approach.
 * Returns a deterministic number between 0 and 1 based on the seed string.
 */
function seededRandom(seed: string): number {
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Normalize to 0-1 range using modulo
  // Use absolute value and divide by max 32-bit integer
  const normalized = Math.abs(hash) / 2147483647;
  return normalized;
}

/**
 * Get emoji for a specific roll based on team_id, participant_id, and roll_count.
 * The same inputs always produce the same emoji (deterministic).
 */
export function getEmojiForRoll(
  teamId: string,
  participantId: string,
  rollCount: number
): string {
  const seed = `${teamId}-${participantId}-${rollCount}`;
  const randomValue = seededRandom(seed);
  const index = Math.floor(randomValue * ALL_EMOJIS.length);
  return ALL_EMOJIS[index];
}

/**
 * Get the next emoji for rolling (increments roll count by 1).
 */
export function getNextEmoji(
  teamId: string,
  participantId: string,
  currentRollCount: number
): { emoji: string; newRollCount: number } {
  const newRollCount = currentRollCount + 1;
  const emoji = getEmojiForRoll(teamId, participantId, newRollCount);
  return { emoji, newRollCount };
}

/**
 * Get initial emoji for auto-roll (roll count = 1).
 */
export function getInitialEmoji(teamId: string, participantId: string): { emoji: string; rollCount: number } {
  return { emoji: getEmojiForRoll(teamId, participantId, 1), rollCount: 1 };
}

/**
 * Get all available emojis (for display purposes if needed).
 */
export function getAllEmojis(): string[] {
  return ALL_EMOJIS;
}

/**
 * Get emoji categories (for display purposes if needed).
 */
export function getEmojiCategories() {
  return {
    animals: ANIMAL_EMOJIS,
    food: FOOD_EMOJIS,
    objects: OBJECT_EMOJIS,
  };
}
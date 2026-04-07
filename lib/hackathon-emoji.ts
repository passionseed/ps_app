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
  // djb2 variant — sensitive to every character including trailing digits
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0) / 0xffffffff;
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
# Sound Effects Implementation

Sound effects have been added to NPC conversation activities.

## What Was Added

### 1. Sound Utility Module (`lib/sounds.ts`)
- Manages audio initialization and playback using `expo-audio`
- Preloads sounds on component mount for instant playback
- Gracefully handles missing sound files during development

### 2. NPC Speak Sound
**When it plays:** When NPC starts typing/speaking in a conversation

**Location:** `app/activity/[activityId].tsx:664`
- Plays when `npcCurrentNode` changes and typing animation begins
- Should be a **scribble/typing sound effect**, not a voice

**Expected file:** `assets/sounds/npc-speak.mp3`

### 3. Activity Complete Sound
**When it plays:** When user completes any activity

**Location:** `app/activity/[activityId].tsx:1116`
- Plays when the completion button is pressed
- Should be a success/achievement sound

**Expected file:** `assets/sounds/activity-complete.mp3`

## Setup Required

**You need to add two MP3 files:**

1. `assets/sounds/npc-speak.mp3`
   - Scribble/pencil writing/typing sound
   - ~0.3-0.8 seconds

2. `assets/sounds/activity-complete.mp3`
   - Success chime or achievement sound
   - ~1-2 seconds

See `assets/sounds/README.md` for detailed instructions and free sound sources.

## How It Works

1. **Initialization:** When activity screen loads, `initializeSounds()` preloads both sounds
2. **NPC Speak:** When NPC node changes → typing animation starts → sound plays
3. **Complete:** When user taps "Complete" button → sound plays → activity marked complete
4. **Cleanup:** When leaving the screen, sounds are unloaded to free memory

## Code Changes

### Files Modified:
- `app/activity/[activityId].tsx` - Added sound imports and playback calls
- `lib/sounds.ts` - New sound utility module (created)
- `assets/sounds/README.md` - Documentation (created)

### Integration Points:
```typescript
// Import
import {
  initializeSounds,
  playNPCSpeakSound,
  playActivityCompleteSound,
  cleanupSounds,
} from "../../lib/sounds";

// Init on mount
useFocusEffect(
  useCallback(() => {
    loadActivity();
    initializeSounds();
    return () => cleanupSounds();
  }, [activityId])
);

// Play when NPC speaks
playNPCSpeakSound();

// Play on complete
playActivityCompleteSound();
```

## Testing

1. Add the required MP3 files to `assets/sounds/`
2. Run `pnpm start`
3. Navigate to any NPC conversation activity
4. You should hear:
   - Scribble sound when NPC starts talking
   - Success sound when you complete the activity

## Notes

- Sounds play even when device is in silent mode (iOS)
- Missing sound files won't crash the app - just logged as warnings
- Uses `expo-audio` (already in dependencies)
- Sounds are preloaded for instant playback

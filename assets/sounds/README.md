# Sound Assets

This directory contains audio files for the app.

## Required Sound Files

1. **npc-speak.mp3** - Sound played when NPC starts speaking
   - **NOT a voice saying words** - should be a scribble/typing/pop sound effect
   - Suggested: Pencil scribbling, typing sound, or speech bubble pop
   - Duration: ~0.3-0.8 seconds
   - Format: MP3
   - Search terms: "scribble sound", "pencil writing", "cartoon speech", "typing sound effect"

2. **activity-complete.mp3** - Sound played when user completes an activity
   - Suggested: Success chime, celebration sound, or "ding"
   - Duration: ~1-2 seconds
   - Format: MP3
   - Search terms: "success sound", "level complete", "achievement", "ding"

## Free Sound Sources

**For NPC Scribble Sound:**
- freesound.org - Search "scribble", "pencil", "writing", "cartoon speech"
- zapsplat.com - Search "writing sound effect" or "scribble"
- mixkit.co/free-sound-effects - Search "whoosh" or "pop"
- pixabay.com/sound-effects - Search "scribble"

**For Activity Complete Sound:**
- freesound.org - Search "success", "complete", "achievement"
- zapsplat.com - Search "success chime"
- mixkit.co - Search "notification" or "success"

**AI Sound Generation:**
- elevenlabs.io/sound-effects
- soundraw.io

## Adding Sound Files

1. Download or create the MP3 files
2. Place them in this directory (`assets/sounds/`)
3. Use **exact names**: `npc-speak.mp3` and `activity-complete.mp3`

## Testing

After adding sound files:
```bash
pnpm start
```

Then navigate to an NPC conversation activity to test the sounds.

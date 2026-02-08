# Backend Integration Guide

Guide för att integrera AI-genererat content med backend service.

## Flow Overview

```
1. Backend → AI Service: POST /generate/round
2. AI Service → Backend: Content Pack JSON
3. Backend → AI Service: POST /tts/batch (pre-generate audio)
4. AI Service → Backend: Audio URLs
5. Backend: Store content + audio references in DB
6. Game starts with pre-generated content
```

## Step 1: Generate Content

```typescript
// Backend: src/game/ai-content-client.ts

interface AIContentPack {
  roundId: string;
  destination: {
    name: string;
    country: string;
    aliases: string[];
  };
  clues: Array<{
    level: 10 | 8 | 6 | 4 | 2;
    text: string;
  }>;
  followups: Array<{
    questionText: string;
    options: string[];
    correctAnswer: string;
  }>;
  metadata: {
    generatedAt: string;
    verified: boolean;
    antiLeakChecked: boolean;
  };
}

export async function generateAIRound(): Promise<AIContentPack> {
  const response = await fetch('http://localhost:3001/generate/round', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to generate content: ${response.statusText}`);
  }

  const { contentPack } = await response.json();
  return contentPack;
}
```

## Step 2: Convert to Backend Format

```typescript
// Backend: src/game/content-converter.ts

import { Destination } from './content-hardcoded';
import { AIContentPack } from './ai-content-client';

export function convertAIContent(aiPack: AIContentPack): Destination {
  return {
    id: aiPack.roundId,
    name: aiPack.destination.name,
    country: aiPack.destination.country,
    aliases: aiPack.destination.aliases,
    clues: aiPack.clues.map((c) => ({
      points: c.level,
      text: c.text,
    })),
    followupQuestions: aiPack.followups.map((f) => ({
      questionText: f.questionText,
      options: f.options,
      correctAnswer: f.correctAnswer,
    })),
  };
}
```

## Step 3: Pre-generate TTS

```typescript
// Backend: src/game/tts-preload.ts

interface TTSRequest {
  roundId: string;
  voiceLines: Array<{
    phraseId: string;
    text: string;
    voiceId: string;
  }>;
}

export async function pregenerateTTS(
  roundId: string,
  destination: Destination
): Promise<void> {
  const voiceLines: TTSRequest['voiceLines'] = [];

  // Add all clues
  destination.clues.forEach((clue, index) => {
    voiceLines.push({
      phraseId: `clue_${clue.points}`,
      text: clue.text,
      voiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'Rachel',
    });
  });

  // Add all followup questions
  destination.followupQuestions.forEach((q, index) => {
    voiceLines.push({
      phraseId: `followup_${index}`,
      text: q.questionText,
      voiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'Rachel',
    });
  });

  // Add destination reveal
  voiceLines.push({
    phraseId: 'reveal',
    text: `Destinationen är ${destination.name}, ${destination.country}!`,
    voiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'Rachel',
  });

  // Send batch TTS request
  const response = await fetch('http://localhost:3001/tts/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId, voiceLines }),
  });

  if (!response.ok) {
    throw new Error(`Failed to pregenerate TTS: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`Pregenerated ${result.clips.length} TTS clips for round ${roundId}`);
}
```

## Step 4: Use in Game Session

```typescript
// Backend: src/game/session-manager.ts

export async function createGameSession(): Promise<string> {
  // Option 1: Use hardcoded content (fast, for testing)
  const destination = getRandomDestination();

  // Option 2: Generate AI content (slower, requires API keys)
  // const aiPack = await generateAIRound();
  // const destination = convertAIContent(aiPack);
  // await pregenerateTTS(destination.id, destination);

  // Create session with destination
  const sessionId = createSession(destination);

  return sessionId;
}
```

## Environment Variables

Backend needs to know where AI service is running:

```bash
# .env
AI_CONTENT_SERVICE_URL=http://localhost:3001
```

## Error Handling

```typescript
export async function generateAIRoundSafe(): Promise<Destination> {
  try {
    const aiPack = await generateAIRound();
    const destination = convertAIContent(aiPack);

    // Try to pregenerate TTS, but don't fail if it doesn't work
    try {
      await pregenerateTTS(destination.id, destination);
    } catch (error) {
      console.warn('Failed to pregenerate TTS, will generate on-demand:', error);
    }

    return destination;
  } catch (error) {
    console.error('Failed to generate AI content, falling back to hardcoded:', error);
    // Fallback to hardcoded content
    return getRandomDestination();
  }
}
```

## Production Considerations

### Caching

Consider caching generated content packs to avoid regenerating on every game:

```typescript
// Store in database or Redis
interface StoredContentPack {
  id: string;
  contentPack: AIContentPack;
  ttsUrls: Record<string, string>; // phraseId → audio URL
  createdAt: Date;
  usedCount: number;
}

// Pre-generate a pool of rounds
async function populateContentPool(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    const pack = await generateAIRound();
    await storeContentPack(pack);
  }
}

// Pull from pool when creating game
async function getContentFromPool(): Promise<Destination> {
  const pack = await getUnusedContentPack();
  return convertAIContent(pack);
}
```

### Rate Limiting

AI generation is slow (30-60s per round). Consider:

- Pre-generating content packs during off-peak hours
- Building a library of 50-100 rounds
- Async generation with job queue

### Cost Optimization

Each round costs:
- ~10-15 Claude API calls (generation + verification)
- ~10-15 ElevenLabs TTS calls

For production:
- Pre-generate and cache rounds
- Reuse popular destinations
- Implement content review workflow before going live

## Testing

Test with example content pack:

```typescript
import examplePack from '../ai-content/test-packs/example-stockholm.json';

const destination = convertAIContent(examplePack);
// Use in tests without hitting AI service
```

## Monitoring

Track AI content performance:

```typescript
interface ContentMetrics {
  totalGenerated: number;
  verificationFailures: number;
  antiLeakFailures: number;
  averageGenerationTime: number;
  playerFeedback: {
    tooEasy: number;
    tooHard: number;
    justRight: number;
  };
}
```

## Future Enhancements

- Real-time generation with SSE progress updates
- Content difficulty selection (easy/medium/hard)
- Theme selection (landmarks, nature, history, etc.)
- Multi-language support
- Player feedback loop to improve quality

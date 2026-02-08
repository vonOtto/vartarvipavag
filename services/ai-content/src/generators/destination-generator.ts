/**
 * Destination Generator
 *
 * Generates interesting travel destinations for the game.
 */

import { callClaude, parseClaudeJSON } from '../claude-client';
import { Destination } from '../types/content-pack';

interface DestinationResponse {
  name: string;
  country: string;
  aliases: string[];
  reasoning: string;
}

const SYSTEM_PROMPT = `Du är en expert på geografi och resor. Din uppgift är att föreslå intressanta destinationer för ett geografiskt frågesport-spel likt "På Spåret".

Välj destinationer som:
- Är kända städer eller platser med rik historia/kultur
- Har tydliga kännetecken som kan användas i ledtrådar
- Är varierande (olika kontinenter, storlekar, typer)
- Inte är för obskyra (måste vara möjliga att gissa)

Svara ENBART med JSON i detta format:
{
  "name": "Stadens namn",
  "country": "Land",
  "aliases": ["lowercase alias 1", "lowercase alias 2"],
  "reasoning": "Kort motivering varför denna destination är bra för spelet"
}`;

export async function generateDestination(): Promise<Destination> {
  const prompt = `Generera EN intressant destination för ett geografiskt quiz-spel.

Destinationen ska:
- Vara en känd stad eller plats
- Ha unika kännetecken
- Vara rolig att gissa på

Inkludera alias (alternativa namn/stavningar) som spelare kan använda.
Exempel: Paris → ["paris", "paree", "ljusets stad"]

Svara med JSON enligt systemprompten.`;

  // Use Sonnet for creative destination generation
  const response = await callClaude(prompt, {
    model: 'sonnet',
    maxTokens: 1024,
    systemPrompt: SYSTEM_PROMPT,
  });
  const parsed = parseClaudeJSON<DestinationResponse>(response);

  // Normalize aliases to lowercase
  const destination: Destination = {
    name: parsed.name,
    country: parsed.country,
    aliases: parsed.aliases.map((a) => a.toLowerCase().trim()),
  };

  // Add the name itself as an alias (lowercase)
  if (!destination.aliases.includes(destination.name.toLowerCase())) {
    destination.aliases.unshift(destination.name.toLowerCase());
  }

  console.log(`[destination-generator] Generated: ${destination.name}, ${destination.country}`);
  console.log(`[destination-generator] Reasoning: ${parsed.reasoning}`);

  return destination;
}

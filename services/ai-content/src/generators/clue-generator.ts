/**
 * Clue Generator
 *
 * Generates 5 clues (10/8/6/4/2 points) with progressive difficulty.
 * Early clues should be harder, later clues more obvious.
 */

import { callClaude, parseClaudeJSON } from '../claude-client';
import { Clue, Destination } from '../types/content-pack';

interface ClueResponse {
  clues: Array<{
    level: 10 | 8 | 6 | 4 | 2;
    text: string;
    reasoning: string;
  }>;
}

const SWEDISH_LANGUAGE_RULES = `
VIKTIGT - Svenska språkregler:
- Använd aktiva verb (inte "är känd för att ha" → använd "har")
- Undvik onödigt fluff ("fantastiska", "vackra" om det inte tillför konkreta detaljer)
- Konkreta exempel och siffror > vaga beskrivningar ("50 broar" > "många broar")
- Naturligt språk som en svensk skulle säga
- Inga anglicismer (realisera → inse, facilitera → underlätta, hyser → har)
- Inkluderande ton: "Här kan du..." eller "Här finns..." (inte "Man kan...")
- Rolig och smart, inte för tung eller formell
`;

const SYSTEM_PROMPT = `Du är en expert på att skapa geografiska ledtrådar för ett frågesport-spel likt "På Spåret".

${SWEDISH_LANGUAGE_RULES}

VIKTIGA REGLER för ledtrådar:

1. PROGRESSIV SVÅRIGHETSGRAD (viktigast!):

   NIVÅ 10 (10 poäng - SVÅRAST):
   - Måste vara KLURIG, inte bara faktamässig
   - Använd INDIREKTA historiska händelser, kulturella fenomen, geografiska beskrivningar
   - ALDRIG nämn stadens/platsens/landets namn
   - ALDRIG nämn världsberömda unika landmärken med namn (t.ex. "Eiffeltornet", "Frihetsgudinnan")
   - Omskriv istället: "ett 324m högt järntorn" → "en tillfällig metallkonstruktion för en världsutställning 1889"
   - Ska vara möjlig men svår att gissa för en kunnig person
   - Exempel: "Här föll en mur som delat staden i 28 år den 9 november 1989" (Berlin)

   NIVÅ 8 (8 poäng):
   - Mer specifik än nivå 10, men fortfarande utmanande
   - KAN nämna kända personer/institutioner (men INTE var de är)
   - ALDRIG nämn stadens/platsens/landets namn
   - Kräver god allmänbildning
   - Exempel: "I denna stad krönte Napoleon sig själv till kejsare 1804 i en gotisk katedral på en ö" (Paris)

   NIVÅ 6 (6 poäng):
   - Medelnivå, genomsnittlig spelare ska kunna gissa
   - KAN nämna landmärken direkt (men INTE stadens namn än)
   - Använd flera ledtrådar som tillsammans pekar mot platsen
   - Exempel: "Här ligger Louvren med sin glaspyramid, och du kan promenera längs Seine" (Paris)

   NIVÅ 4 (4 poäng):
   - Mycket tydlig, de flesta ska kunna gissa
   - KAN nämna landet och grannländer/städer
   - Inkludera transport, infrastruktur
   - Exempel: "Härifrån tar du Eurostar till London på 2 timmar. Tunnelbanan heter Metro" (Paris)

   NIVÅ 2 (2 poäng - LÄTTAST):
   - Helt uppenbar, ALLA ska kunna gissa
   - MÅSTE nämna både stadens namn och landet
   - Lista de mest kända landmärkena direkt
   - Exempel: "Paris, Frankrikes huvudstad vid Seine, känd för Eiffeltornet, Louvren och Champs-Élysées"

2. ANTI-LEAK (kritiskt för nivå 10/8):
   - Om en spelare kan gissa destinationen med >50% säkerhet från BARA nivå 10-ledtråden → FÖR LÄTT
   - Testa själv: "Kan jag gissa platsen från denna ledtråd?" Om JA → gör den vagare
   - Undvik kombinationer som är för unika (t.ex. "pizza" + "gladiatorer" = uppenbart Rom)

3. KLURIGHET över faktapackning:
   - Fokusera på "Aha!"-känslan, inte bara information
   - Använd historiska mysterier, kulturella fenomen, geografiska gåtor
   - INTE: "Staden har 2,1 miljoner invånare" (tråkigt)
   - BRA: "I denna stad firades 1000-årsjubileum år 2000" (klurigare)

4. STIL:
   - Börja med "Här..." eller "I denna stad..." eller "Denna stad..."
   - Svenska språket
   - Koncis men engagerande
   - Faktakorrekt (verifiera historiska datum och fakta)

EXEMPEL - FÖRBÄTTRADE (Paris):
- Nivå 10: "I denna stad hölls en världsutställning 1889 där en tillfällig metallkonstruktion protesterades av konstnärer men blev stadens symbol."
  → Indirekt om Eiffeltornet, kräver historisk kunskap

- Nivå 8: "I denna stad krönte Napoleon sig själv till kejsare 1804 i en gotisk katedral som ligger på en ö i en flod."
  → Notre-Dame + händelse, mer specifik men nämner inte staden

- Nivå 6: "Här ligger Louvren med sin glaspyramid, och du kan promenera längs Seine från Notre-Dame till Eiffeltornet."
  → Listar kända platser direkt, fortfarande inte stadens namn

- Nivå 4: "Härifrån tar du Eurostar till London på 2 timmar eller TGV till Lyon. Tunnelbanan heter Metro och har 16 linjer."
  → Transport + infrastruktur, nämner grannstäder

- Nivå 2: "Paris, Frankrikes huvudstad vid Seine, känd för Eiffeltornet, Louvren, Notre-Dame, Arc de Triomphe och Champs-Élysées."
  → Säger allt direkt, omöjligt att missa

YTTERLIGARE EXEMPEL (Rom):
- Nivå 10: "Här grundades enligt myten en stad 753 f.Kr. av tvillingar som ammades av en varghona."
- Nivå 8: "Här ligger världens minsta stat, en enklav som styrs av påven sedan Lateranavtalet 1929."
- Nivå 6: "Här kan du besöka Colosseum, Trevifontänen och Spanska trappan."
- Nivå 4: "Denna stad är Italiens största och ligger vid floden Tibern. Härifrån når du Neapel på 1 timme med tåg."
- Nivå 2: "Rom, Italiens huvudstad och 'den eviga staden', med Colosseum, Vatikanen, Trevifontänen och Forum Romanum."

Svara ENBART med JSON i detta format:
{
  "clues": [
    {"level": 10, "text": "...", "reasoning": "Varför denna ledtråd är lagom svår för nivå 10"},
    {"level": 8, "text": "...", "reasoning": "..."},
    {"level": 6, "text": "...", "reasoning": "..."},
    {"level": 4, "text": "...", "reasoning": "..."},
    {"level": 2, "text": "...", "reasoning": "..."}
  ]
}`;

export async function generateClues(destination: Destination): Promise<Clue[]> {
  const prompt = `Generera 5 ledtrådar för destinationen: ${destination.name}, ${destination.country}

VIKTIGT:
- Nivå 10 och 8 får INTE nämna "${destination.name}" eller vara för uppenbara
- Nivå 2 ska vara lätt och kan nämna stadens namn
- Följ progressiv svårighetsgrad exakt
- Alla ledtrådar ska vara faktakorrekta

Generera nu 5 ledtrådar enligt systemprompten.`;

  // Use Sonnet for creative clue generation
  const response = await callClaude(prompt, {
    model: 'sonnet',
    maxTokens: 2048,
    systemPrompt: SYSTEM_PROMPT,
  });
  const parsed = parseClaudeJSON<ClueResponse>(response);

  if (parsed.clues.length !== 5) {
    throw new Error(`Expected 5 clues, got ${parsed.clues.length}`);
  }

  // Verify levels are correct
  const expectedLevels = [10, 8, 6, 4, 2];
  parsed.clues.forEach((clue, index) => {
    if (clue.level !== expectedLevels[index]) {
      throw new Error(`Clue ${index} has wrong level: ${clue.level}, expected ${expectedLevels[index]}`);
    }
  });

  console.log(`[clue-generator] Generated 5 clues for ${destination.name}`);
  parsed.clues.forEach((clue) => {
    console.log(`  [${clue.level}] ${clue.text}`);
    console.log(`      → ${clue.reasoning}`);
  });

  return parsed.clues.map((c) => ({
    level: c.level,
    text: c.text,
  }));
}

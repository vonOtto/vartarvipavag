/**
 * Generic Followup Pool
 *
 * Pre-defined geography/culture/history questions that can be used for any destination.
 * Mix with destination-specific followups to reduce generation costs.
 */

import { FollowupQuestion } from './types/content-pack';

export const GENERIC_FOLLOWUPS: Array<FollowupQuestion & { id: string; category: string }> = [
  // Geography - General
  {
    id: 'geo-001',
    category: 'geography',
    questionText: 'Vilken är den största sjön i Europa?',
    options: ['Vänern', 'Ladoga', 'Genèvesjön', 'Balatonsjön'],
    correctAnswer: 'Ladoga',
  },
  {
    id: 'geo-002',
    category: 'geography',
    questionText: 'Vilket land har flest invånare i världen?',
    options: ['Kina', 'Indien', 'USA', 'Indonesien'],
    correctAnswer: 'Indien',
  },
  {
    id: 'geo-003',
    category: 'geography',
    questionText: 'Vilket är världens längsta flod?',
    options: ['Nilen', 'Amazonas', 'Yangtze', 'Mississippi'],
    correctAnswer: 'Nilen',
  },
  {
    id: 'geo-004',
    category: 'geography',
    questionText: 'Vilket är världens högsta berg?',
    options: ['Mount Everest', 'K2', 'Kilimanjaro', 'Mont Blanc'],
    correctAnswer: 'Mount Everest',
  },
  {
    id: 'geo-005',
    category: 'geography',
    questionText: 'Vilket land har störst yta?',
    options: ['Ryssland', 'Kanada', 'Kina', 'USA'],
    correctAnswer: 'Ryssland',
  },
  {
    id: 'geo-006',
    category: 'geography',
    questionText: 'I vilket land ligger Himalaya främst?',
    options: ['Nepal', 'Indien', 'Kina', 'Bhutan'],
    correctAnswer: 'Nepal',
  },
  {
    id: 'geo-007',
    category: 'geography',
    questionText: 'Vilket hav är störst?',
    options: ['Stilla havet', 'Atlanten', 'Indiska oceanen', 'Arktiska oceanen'],
    correctAnswer: 'Stilla havet',
  },
  {
    id: 'geo-008',
    category: 'geography',
    questionText: 'Vilket land har flest öar?',
    options: ['Sverige', 'Finland', 'Indonesien', 'Filippinerna'],
    correctAnswer: 'Sverige',
  },

  // Culture & History
  {
    id: 'cul-001',
    category: 'culture',
    questionText: 'Vilken valuta används i Japan?',
    options: ['Yen', 'Won', 'Yuan', 'Rupee'],
    correctAnswer: 'Yen',
  },
  {
    id: 'cul-002',
    category: 'culture',
    questionText: 'I vilket land uppfanns pizzan?',
    options: ['Italien', 'Grekland', 'USA', 'Spanien'],
    correctAnswer: 'Italien',
  },
  {
    id: 'cul-003',
    category: 'culture',
    questionText: 'Vilket språk talas i Brasilien?',
    options: ['Portugisiska', 'Spanska', 'Engelska', 'Franska'],
    correctAnswer: 'Portugisiska',
  },
  {
    id: 'cul-004',
    category: 'culture',
    questionText: 'När firar man midsommar i Sverige?',
    options: ['Juni', 'Juli', 'Maj', 'Augusti'],
    correctAnswer: 'Juni',
  },
  {
    id: 'cul-005',
    category: 'culture',
    questionText: 'Vilket land är känt för tulpaner och vindkraftverk?',
    options: ['Nederländerna', 'Belgien', 'Danmark', 'Tyskland'],
    correctAnswer: 'Nederländerna',
  },
  {
    id: 'cul-006',
    category: 'culture',
    questionText: 'Vilken valuta används i Storbritannien?',
    options: ['Pund', 'Euro', 'Dollar', 'Krona'],
    correctAnswer: 'Pund',
  },

  // Europe
  {
    id: 'eur-001',
    category: 'europe',
    questionText: 'Vilket land ligger Alperna främst i?',
    options: ['Schweiz', 'Österrike', 'Frankrike', 'Italien'],
    correctAnswer: 'Schweiz',
  },
  {
    id: 'eur-002',
    category: 'europe',
    questionText: 'Vilket land är känt för Akropolis?',
    options: ['Grekland', 'Italien', 'Turkiet', 'Spanien'],
    correctAnswer: 'Grekland',
  },
  {
    id: 'eur-003',
    category: 'europe',
    questionText: 'Vilken flod flödar genom Berlin?',
    options: ['Spree', 'Elbe', 'Rhein', 'Donau'],
    correctAnswer: 'Spree',
  },
  {
    id: 'eur-004',
    category: 'europe',
    questionText: 'Vilket land är känt för fjordar?',
    options: ['Norge', 'Sverige', 'Island', 'Danmark'],
    correctAnswer: 'Norge',
  },
  {
    id: 'eur-005',
    category: 'europe',
    questionText: 'I vilket land ligger Prado-museet?',
    options: ['Spanien', 'Portugal', 'Italien', 'Frankrike'],
    correctAnswer: 'Spanien',
  },

  // World Landmarks
  {
    id: 'lnd-001',
    category: 'landmarks',
    questionText: 'I vilket land ligger Taj Mahal?',
    options: ['Indien', 'Pakistan', 'Bangladesh', 'Nepal'],
    correctAnswer: 'Indien',
  },
  {
    id: 'lnd-002',
    category: 'landmarks',
    questionText: 'I vilket land ligger Kinesiska muren?',
    options: ['Kina', 'Japan', 'Korea', 'Vietnam'],
    correctAnswer: 'Kina',
  },
  {
    id: 'lnd-003',
    category: 'landmarks',
    questionText: 'I vilket land ligger Operahuset i Sydney?',
    options: ['Australien', 'Nya Zeeland', 'Singapore', 'Malaysia'],
    correctAnswer: 'Australien',
  },
  {
    id: 'lnd-004',
    category: 'landmarks',
    questionText: 'I vilket land ligger Frihetsgudinnan?',
    options: ['USA', 'Frankrike', 'Storbritannien', 'Kanada'],
    correctAnswer: 'USA',
  },
  {
    id: 'lnd-005',
    category: 'landmarks',
    questionText: 'I vilket land ligger pyramiderna i Giza?',
    options: ['Egypten', 'Sudan', 'Marocko', 'Tunisien'],
    correctAnswer: 'Egypten',
  },

  // Capitals
  {
    id: 'cap-001',
    category: 'capitals',
    questionText: 'Vad heter huvudstaden i Norge?',
    options: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger'],
    correctAnswer: 'Oslo',
  },
  {
    id: 'cap-002',
    category: 'capitals',
    questionText: 'Vad heter huvudstaden i Australien?',
    options: ['Canberra', 'Sydney', 'Melbourne', 'Brisbane'],
    correctAnswer: 'Canberra',
  },
  {
    id: 'cap-003',
    category: 'capitals',
    questionText: 'Vad heter huvudstaden i Kanada?',
    options: ['Ottawa', 'Toronto', 'Vancouver', 'Montreal'],
    correctAnswer: 'Ottawa',
  },
  {
    id: 'cap-004',
    category: 'capitals',
    questionText: 'Vad heter huvudstaden i Schweiz?',
    options: ['Bern', 'Zürich', 'Genève', 'Basel'],
    correctAnswer: 'Bern',
  },
  {
    id: 'cap-005',
    category: 'capitals',
    questionText: 'Vad heter huvudstaden i Turkiet?',
    options: ['Ankara', 'Istanbul', 'Izmir', 'Antalya'],
    correctAnswer: 'Ankara',
  },

  // Climate & Nature
  {
    id: 'nat-001',
    category: 'nature',
    questionText: 'Vilket är världens största regnskogsområde?',
    options: ['Amazonas', 'Kongo', 'Sydostasien', 'Indonesien'],
    correctAnswer: 'Amazonas',
  },
  {
    id: 'nat-002',
    category: 'nature',
    questionText: 'Vilket land har störst del av Sahara?',
    options: ['Algeriet', 'Egypten', 'Libyen', 'Sudan'],
    correctAnswer: 'Algeriet',
  },
  {
    id: 'nat-003',
    category: 'nature',
    questionText: 'Vilket land är känt för Great Barrier Reef?',
    options: ['Australien', 'Indonesien', 'Filippinerna', 'Mexiko'],
    correctAnswer: 'Australien',
  },
  {
    id: 'nat-004',
    category: 'nature',
    questionText: 'Vilket land har flest vulkaner?',
    options: ['Indonesien', 'Japan', 'Island', 'Italien'],
    correctAnswer: 'Indonesien',
  },
];

/**
 * Mix generic and destination-specific followups
 * Recommended: 60% generic, 40% destination-specific
 */
export function mixFollowups(
  destinationSpecific: FollowupQuestion[],
  totalCount: number
): FollowupQuestion[] {
  const genericCount = Math.ceil(totalCount * 0.6);
  const specificCount = totalCount - genericCount;

  // Shuffle and select random generic followups
  const shuffled = [...GENERIC_FOLLOWUPS].sort(() => Math.random() - 0.5);
  const selectedGeneric = shuffled.slice(0, genericCount).map((f) => ({
    questionText: f.questionText,
    options: f.options,
    correctAnswer: f.correctAnswer,
  }));

  // Take the first N destination-specific followups
  const selectedSpecific = destinationSpecific.slice(0, specificCount);

  // Mix them together
  const mixed = [...selectedGeneric, ...selectedSpecific];

  // Shuffle the final mix
  return mixed.sort(() => Math.random() - 0.5);
}

/**
 * Get random generic followups
 */
export function getRandomGenericFollowups(count: number): FollowupQuestion[] {
  const shuffled = [...GENERIC_FOLLOWUPS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((f) => ({
    questionText: f.questionText,
    options: f.options,
    correctAnswer: f.correctAnswer,
  }));
}

/**
 * Get total count of generic followups
 */
export function getGenericFollowupCount(): number {
  return GENERIC_FOLLOWUPS.length;
}

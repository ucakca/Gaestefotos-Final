import { EventCategory } from './eventTypes';

export interface AlbumSuggestion {
  name: string;
  iconKey: string;
  description?: string;
}

export const ALBUM_SUGGESTIONS: Record<EventCategory, AlbumSuggestion[]> = {
  wedding: [
    { name: 'Brautpaar', iconKey: 'Heart', description: 'Fotos vom Brautpaar' },
    { name: 'Zeremonie', iconKey: 'Church', description: 'Trauung & Zeremonie' },
    { name: 'Getting Ready', iconKey: 'Sparkles', description: 'Vorbereitungen' },
    { name: 'Party & Tanz', iconKey: 'Music', description: 'Feier & Tanzfläche' },
    { name: 'Gruppenfoto', iconKey: 'Users', description: 'Alle Gäste' },
    { name: 'Torte & Essen', iconKey: 'Cake', description: 'Hochzeitstorte & Buffet' },
    { name: 'Location', iconKey: 'MapPin', description: 'Fotos der Location' },
  ],
  family: [
    { name: 'Familie', iconKey: 'Home', description: 'Familienfotos' },
    { name: 'Kinder', iconKey: 'Baby', description: 'Kinderfotos' },
    { name: 'Geschenke', iconKey: 'Gift', description: 'Geschenke auspacken' },
    { name: 'Torte', iconKey: 'Cake', description: 'Geburtstagstorte' },
    { name: 'Spiele', iconKey: 'Gamepad2', description: 'Spiele & Aktivitäten' },
    { name: 'Gruppenfoto', iconKey: 'Users', description: 'Alle Gäste' },
  ],
  milestone: [
    { name: 'Zeremonie', iconKey: 'Award', description: 'Offizielle Zeremonie' },
    { name: 'Gruppenfoto', iconKey: 'Users', description: 'Alle Gäste' },
    { name: 'Feier', iconKey: 'PartyPopper', description: 'Feier & Party' },
    { name: 'Reden', iconKey: 'Mic', description: 'Reden & Ansprachen' },
  ],
  business: [
    { name: 'Keynote', iconKey: 'Presentation', description: 'Hauptvorträge' },
    { name: 'Networking', iconKey: 'Handshake', description: 'Networking-Momente' },
    { name: 'Team', iconKey: 'Users', description: 'Teamfotos' },
    { name: 'Location', iconKey: 'Building2', description: 'Event-Location' },
    { name: 'Produkte', iconKey: 'Package', description: 'Produktpräsentationen' },
  ],
  party: [
    { name: 'Party', iconKey: 'PartyPopper', description: 'Party-Highlights' },
    { name: 'Tanzfläche', iconKey: 'Music', description: 'Auf der Tanzfläche' },
    { name: 'Drinks', iconKey: 'GlassWater', description: 'An der Bar' },
    { name: 'Gruppenfoto', iconKey: 'Users', description: 'Alle zusammen' },
    { name: 'Lustige Momente', iconKey: 'Laugh', description: 'Witzige Schnappschüsse' },
  ],
  custom: [
    { name: 'Highlights', iconKey: 'Star', description: 'Beste Momente' },
    { name: 'Gruppenfoto', iconKey: 'Users', description: 'Alle Gäste' },
    { name: 'Details', iconKey: 'Camera', description: 'Detailaufnahmen' },
  ],
};

export function getAlbumSuggestionsForEvent(
  eventType: EventCategory | string | null | undefined,
  eventSubtype?: string | null
): AlbumSuggestion[] {
  const type = (eventType as EventCategory) || 'custom';
  const baseSuggestions = ALBUM_SUGGESTIONS[type] || ALBUM_SUGGESTIONS.custom;
  
  // Add subtype-specific suggestions
  if (eventSubtype) {
    switch (eventSubtype) {
      case 'henna':
      case 'mehndi':
        return [
          { name: 'Henna', iconKey: 'Hand', description: 'Henna-Kunst' },
          { name: 'Tanz', iconKey: 'Music', description: 'Tänze & Musik' },
          ...baseSuggestions.filter(s => s.name !== 'Zeremonie'),
        ];
      case 'polterabend':
      case 'jga':
        return [
          { name: 'Spiele', iconKey: 'Gamepad2', description: 'Partyspiele' },
          { name: 'Kostüme', iconKey: 'Shirt', description: 'Outfits & Kostüme' },
          ...ALBUM_SUGGESTIONS.party,
        ];
      case 'baptism':
        return [
          { name: 'Taufe', iconKey: 'Droplets', description: 'Taufzeremonie' },
          { name: 'Baby', iconKey: 'Baby', description: 'Das Taufkind' },
          ...baseSuggestions.filter(s => !['Kinder', 'Torte'].includes(s.name)),
        ];
      case 'kids':
        return [
          { name: 'Geburtstagskind', iconKey: 'Crown', description: 'Das Geburtstagskind' },
          { name: 'Spiele', iconKey: 'Gamepad2', description: 'Partyspiele' },
          { name: 'Geschenke', iconKey: 'Gift', description: 'Geschenke auspacken' },
          { name: 'Torte', iconKey: 'Cake', description: 'Geburtstagstorte' },
          { name: 'Alle Kinder', iconKey: 'Users', description: 'Gruppenfoto' },
        ];
      default:
        return baseSuggestions;
    }
  }
  
  return baseSuggestions;
}

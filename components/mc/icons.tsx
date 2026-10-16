// Jeu d'icônes original MapCrew (grille 24 px, trait 1,75, extrémités arrondies, currentColor),
// recopié de design/mapcrew/components/bundle.js. L'icône « star4 » du bundle n'est pas reprise :
// règle de contenu n° 2 du README (aucune étoile dans le jeu d'icônes).
// Les chemins sont des constantes du design system, jamais des données utilisateur : on peut les
// injecter tels quels dans le <svg>.

const PATHS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  map: '<path d="M9 4L3.5 6.3v13.5L9 17.5l6 2.5 5.5-2.3V4.2L15 6.5 9 4z"/><path d="M9 4v13.5M15 6.5V20"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r=".9"/><circle cx="4.8" cy="12" r=".9"/><circle cx="4.8" cy="17.5" r=".9"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  car: '<path d="M4.5 16.5v-4l2.1-5.1A2 2 0 018.5 6h7a2 2 0 011.9 1.4l2.1 5.1v4"/><path d="M3.5 16.5h17M4.5 12.5h15M6.5 16.5v2.5M17.5 16.5v2.5"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 015.5 7h2.3l1.5-2h5.4l1.5 2h2.3A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6L12 3z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 018 0v2.5M12 14.5v2"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
  id: '<rect x="3" y="5" width="18" height="14" rx="2.2"/><circle cx="9" cy="10.8" r="2.1"/><path d="M5.8 16c.6-1.5 1.8-2.3 3.2-2.3s2.6.8 3.2 2.3M14.5 10h4M14.5 13.5h3"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M11 18.5h2"/>',
  wallet: '<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 10h17M15.5 14.5h1.5"/>',
  bank: '<path d="M3.5 9.5L12 4.5l8.5 5M5.5 10.5v7M10 10.5v7M14 10.5v7M18.5 10.5v7M3.5 20h17"/>',
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  "chev-right": '<path d="M9.5 6l6 6-6 6"/>',
  "chev-down": '<path d="M6 9.5l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  "wifi-off": '<path d="M3.5 3.5l17 17M8.6 16.3a5 5 0 016.8 0M5.2 12.8a9.8 9.8 0 014-2.3M18.8 12.8a10 10 0 00-2.6-1.8M2.3 9.3a14.8 14.8 0 015.2-3M21.7 9.3A14.8 14.8 0 0012.8 5.5"/><circle cx="12" cy="19.5" r=".8"/>',
  "cloud-check": '<path d="M7 18.5a4.5 4.5 0 01-.6-8.96A6 6 0 0117.8 8.7a4 4 0 01-.3 9.8z"/><path d="M9.5 13.5l2 2 3.5-3.6"/>',
  refresh: '<path d="M19.5 10.5A7.8 7.8 0 005.8 7.2L4.5 8.8M4.5 4.5v4.3h4.3M4.5 13.5a7.8 7.8 0 0013.7 3.3l1.3-1.6M19.5 19.5v-4.3h-4.3"/>',
  play: '<path d="M8.5 5.8v12.4a.8.8 0 001.2.7l9.8-6.2a.8.8 0 000-1.4L9.7 5.1a.8.8 0 00-1.2.7z"/>',
  pen: '<path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17z"/><path d="M14 7.5l2.5 2.5"/>',
  users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.9-3 3.2-4.7 6-4.7s5.1 1.7 6 4.7M16 5.4a3.2 3.2 0 010 6.2M17.5 14.9c1.8.6 3 2.2 3.5 4.6"/>',
  store: '<path d="M4.5 10.5v9h15v-9M3 7l1.6-3h14.8L21 7v.8a2.7 2.7 0 01-5.4 0 2.7 2.7 0 01-5.4 0 2.7 2.7 0 01-5.4 0 2.7 2.7 0 01-1.8-.8z"/><path d="M10 19.5V15h4v4.5"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 014.8.9c0 1.7-2.4 2.2-2.4 3.7"/><circle cx="12" cy="17" r=".8"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".8"/>',
  truck: '<path d="M3 6.5h10.5v9.5H3zM13.5 10h3.8l3.2 3.2V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  hammer: '<path d="M13.5 4.5l6 6-2 2-2-2-8 8a1.8 1.8 0 01-2.5-2.5l8-8-1.5-1.5z"/>',
  tree: '<path d="M12 21v-4.5M12 3L6.5 10.5h3L5.5 16.5h13l-4-6h3z"/>',
  roof: '<path d="M3 12L12 4l9 8M5.5 10v10h13V10M10 20v-5h4v5"/>',
  fence: '<path d="M5.5 20V6.5l2-2.5 2 2.5V20M14.5 20V6.5l2-2.5 2 2.5V20M3 10h18M3 15h18"/>',
  brick: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M3.5 9.7h17M3.5 14.3h17M9 5v4.7M15 5v4.7M12 9.7v4.6M6.5 14.3V19M17.5 14.3V19"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
  chat: '<path d="M5 18.5V6.5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H8.5z"/><path d="M8.5 9h7M8.5 12.3h4.5"/>',
  cap: '<path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.4 3.4 2.2 5.5 2.2s4-.8 5.5-2.2V11M21.5 9v5"/>',
  video: '<rect x="3" y="6.5" width="12.5" height="11" rx="2"/><path d="M15.5 10.5l5-3v9l-5-3"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h11.5l-2.3 4 2.3 4H5.5"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10"/>',
  alert: '<path d="M12 4.5l8.5 15h-17z"/><path d="M12 10.5v4"/><circle cx="12" cy="17" r=".8"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><circle cx="9" cy="9.8" r="1.7"/><path d="M20.5 15.5l-5-5-10.5 9"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3.8 7.2l8.2 6 8.2-6"/>',
  "check-out": '<path d="M13.5 4.5H6.5v15h7M10 12h10M17 9l3 3-3 3"/>',
  "check-in": '<path d="M10.5 4.5h7v15h-7M3.5 12h10M10.5 9l3 3-3 3"/>',
  invite: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 19.5c1-3.2 3.6-5 6.5-5 1.4 0 2.8.4 3.9 1.2M18 13v6M15 16h6"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7.5a3 3 0 000-6h-7a3 3 0 010-6H16"/>',
} as const

export type IconName = keyof typeof PATHS

export const ICON_NAMES = Object.keys(PATHS) as IconName[]

/** Icône décorative (aria-hidden) : le texte voisin porte le sens. Nom inconnu → « info », comme MapCrew.icon. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  const body: string = PATHS[name] ?? PATHS.info
  return (
    <span className={className ? `mc-ico ${className}` : 'mc-ico'} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </span>
  )
}

/** Icône de métier à partir du libellé libre d'un pro (« Fence contractor », « fencing »…). Port de MapCrew.tradeIcon. */
export function tradeIcon(trade: string): IconName {
  const t = trade.toLowerCase()
  if (/concrete|masonry|brick/.test(t)) return 'brick'
  if (/fenc/.test(t)) return 'fence'
  if (/roof/.test(t)) return 'roof'
  if (/tree/.test(t)) return 'tree'
  return 'hammer'
}

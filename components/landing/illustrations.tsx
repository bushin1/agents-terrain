import { PIN_BODY_PATH } from '@/components/mc/pin'

// Illustrations à plat dans la palette MapCrew (couleurs = jetons CSS du design system, donc thème clair/sombre).
// Ce sont des dessins, pas des photos : les vraies photos d'agents remplaceront certaines scènes plus tard.

type Hair = 'short' | 'bun' | 'cap' | 'curly'
type Pose = 'down' | 'phone' | 'point' | 'camera'

interface PersonProps {
  x: number
  base?: number
  scale?: number
  skin: string
  shirt: string
  pants: string
  hair: string
  hairStyle: Hair
  pose?: Pose
  flip?: boolean
  backpack?: boolean
  vest?: boolean
}

// Personnage debout, pieds sur la ligne `base`. Dessiné face à droite ; `flip` le tourne vers la gauche.
function Person({ x, base = 182, scale = 1, skin, shirt, pants, hair, hairStyle, pose = 'down', flip, backpack, vest }: PersonProps) {
  const ink = 'var(--ink)'
  const arm = { stroke: shirt, strokeWidth: 9, strokeLinecap: 'round' as const, fill: 'none' }
  return (
    <g transform={`translate(${x} ${base}) scale(${flip ? -scale : scale} ${scale})`}>
      {/* ombre */}
      <ellipse cx="0" cy="2" rx="24" ry="4" fill="var(--ink)" opacity=".12" />
      {backpack && <rect x="-25" y="-90" width="16" height="36" rx="6" fill="var(--signal)" stroke={ink} strokeWidth="1.5" />}
      {/* jambes et chaussures */}
      <rect x="-11" y="-46" width="10" height="44" rx="4" fill={pants} />
      <rect x="2" y="-46" width="10" height="44" rx="4" fill={pants} />
      <rect x="-14" y="-5" width="14" height="6" rx="3" fill={ink} />
      <rect x="1" y="-5" width="14" height="6" rx="3" fill={ink} />
      {/* bras arrière */}
      <path d="M-13 -84 Q-20 -68 -18 -54" {...arm} />
      <circle cx="-18" cy="-52" r="4.5" fill={skin} />
      {/* buste */}
      <rect x="-16" y="-94" width="32" height="54" rx="13" fill={shirt} />
      {vest && <path d="M-16 -80 L-6 -94 L6 -94 L16 -80 L16 -52 Q16 -40 4 -40 L-4 -40 Q-16 -40 -16 -52 Z" fill="var(--signal)" opacity=".9" />}
      {vest && <path d="M-15 -62 H15" stroke="var(--map-street)" strokeWidth="3" />}
      {/* bras avant selon la pose */}
      {pose === 'down' && (<><path d="M13 -84 Q20 -68 18 -54" {...arm} /><circle cx="18" cy="-52" r="4.5" fill={skin} /></>)}
      {pose === 'phone' && (
        <>
          <path d="M13 -84 Q24 -72 24 -66" {...arm} />
          <rect x="20" y="-82" width="11" height="18" rx="2.5" fill={ink} />
          <rect x="22" y="-80" width="7" height="12" rx="1" fill="var(--signal)" />
          <circle cx="24" cy="-64" r="4.5" fill={skin} />
        </>
      )}
      {pose === 'point' && (<><path d="M13 -84 Q26 -84 36 -82" {...arm} /><circle cx="38" cy="-82" r="4.5" fill={skin} /></>)}
      {pose === 'camera' && (
        <>
          <path d="M13 -84 Q24 -90 26 -96" {...arm} />
          <rect x="22" y="-110" width="16" height="11" rx="2.5" fill={ink} />
          <circle cx="30" cy="-104.5" r="3" fill="var(--map-water)" />
          <circle cx="26" cy="-97" r="4.5" fill={skin} />
        </>
      )}
      {/* cou et tête */}
      <rect x="-4" y="-100" width="8" height="8" rx="2" fill={skin} />
      <circle cx="0" cy="-110" r="13" fill={skin} />
      <circle cx="6" cy="-111" r="1.6" fill={ink} />
      <path d="M4 -104 Q7 -102 9 -104" stroke={ink} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {hairStyle === 'short' && <path d="M-13 -110 Q-14 -126 0 -125 Q12 -125 13 -114 Q5 -119 -4 -117 Q-8 -112 -13 -110 Z" fill={hair} />}
      {hairStyle === 'bun' && (<><circle cx="-8" cy="-124" r="6" fill={hair} /><path d="M-13 -108 Q-14 -125 1 -124 Q13 -123 13 -113 Q4 -118 -5 -116 Q-9 -110 -13 -104 Z" fill={hair} /></>)}
      {hairStyle === 'curly' && (<><circle cx="-8" cy="-120" r="7" fill={hair} /><circle cx="2" cy="-123" r="7" fill={hair} /><circle cx="10" cy="-117" r="5" fill={hair} /><circle cx="-12" cy="-111" r="5" fill={hair} /></>)}
      {hairStyle === 'cap' && (<><path d="M-13 -112 Q-13 -126 0 -126 Q13 -126 13 -112 Z" fill="var(--forest)" /><path d="M8 -113 H22 Q22 -110 18 -109 H8 Z" fill="var(--forest)" /></>)}
    </g>
  )
}

const SKIN = ['#f1c7a3', '#c98f65', '#8d5a3b', '#e7b48c']
const HAIR = ['#2b211c', '#5a3a22', '#17201c', '#8a5a2b']

// Pin de marque flottant, avec coche : « cette entreprise est maintenant sur la carte ».
function BrandPin({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="17" cy="47" rx="9" ry="2.5" fill="var(--ink)" opacity=".15" />
      <path d={PIN_BODY_PATH} fill="var(--signal)" stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="17" cy="16.5" r="7" fill="var(--map-street)" />
      <path d="M13.5 16.8 L16 19.2 L20.8 14" stroke="var(--success)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

function Ground({ sky }: { sky: string }) {
  return (
    <>
      <rect width="360" height="220" fill={sky} />
      <rect x="0" y="96" width="70" height="90" rx="4" fill="var(--map-block)" />
      <rect x="78" y="70" width="54" height="116" rx="4" fill="var(--map-block)" opacity=".8" />
      <rect x="292" y="84" width="68" height="102" rx="4" fill="var(--map-block)" />
      <rect x="0" y="182" width="360" height="38" fill="var(--map-street)" />
      <path d="M0 182 H360" stroke="var(--line)" strokeWidth="2" />
      <path d="M20 202 H60 M100 202 H140 M180 202 H220 M260 202 H300" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
    </>
  )
}

function Wheel({ cx }: { cx: number }) {
  return (
    <g>
      <circle cx={cx} cy="176" r="12" fill="var(--ink)" />
      <circle cx={cx} cy="176" r="5" fill="var(--map-block)" />
    </g>
  )
}

// Pick-up de l'artisan, porte siglée d'un pin.
function Pickup({ x, mixer }: { x: number; mixer?: boolean }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {mixer ? (
        <g>
          <rect x="0" y="120" width="96" height="10" rx="3" fill="var(--ink-muted)" />
          <ellipse cx="48" cy="104" rx="46" ry="26" fill="var(--map-street)" stroke="var(--ink)" strokeWidth="1.5" transform="rotate(-10 48 104)" />
          <path d="M18 92 L30 122 M42 84 L54 124 M66 82 L76 116" stroke="var(--signal)" strokeWidth="6" strokeLinecap="round" />
        </g>
      ) : (
        <path d="M0 132 H96 V156 H0 Z" fill="var(--forest)" />
      )}
      <path d="M0 130 H96 V166 H0 Z" fill="var(--forest)" />
      <path d="M96 166 V118 Q96 108 106 108 H134 Q144 108 150 120 L160 136 Q164 140 164 148 V166 Z" fill="var(--forest)" />
      <path d="M104 116 H132 Q138 116 142 124 L148 136 H104 Z" fill="var(--map-water)" />
      <g transform="translate(112 140) scale(.42)">
        <path d={PIN_BODY_PATH} fill="var(--signal)" />
        <circle cx="17" cy="16.5" r="5.5" fill="var(--forest)" />
      </g>
      <rect x="158" y="150" width="8" height="6" rx="2" fill="var(--pending-soft)" />
      <Wheel cx={30} />
      <Wheel cx={128} />
    </g>
  )
}

function Tree({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="-6" y="120" width="12" height="62" rx="3" fill="var(--level-bronze)" />
      <circle cx="0" cy="100" r="34" fill="var(--map-park)" />
      <circle cx="-22" cy="116" r="22" fill="var(--map-park)" />
      <circle cx="22" cy="114" r="24" fill="var(--success)" opacity=".55" />
    </g>
  )
}

function House({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y="110" width="120" height="72" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5" />
      <path d="M-10 112 L60 62 L130 112 Z" fill="var(--forest)" />
      <path d="M8 104 L60 68 L112 104" stroke="var(--signal)" strokeWidth="3" fill="none" strokeDasharray="8 6" />
      <rect x="18" y="128" width="26" height="22" fill="var(--map-water)" />
      <rect x="74" y="136" width="26" height="46" fill="var(--map-block)" />
      {/* échelle posée contre le toit */}
      <path d="M128 182 L108 92 M140 182 L120 92" stroke="var(--ink-muted)" strokeWidth="3" />
      <path d="M126 170 H138 M123 154 H135 M119 138 H131 M116 122 H128 M112 106 H124" stroke="var(--ink-muted)" strokeWidth="2.5" />
    </g>
  )
}

export type SceneName = 'visit' | 'student' | 'parent' | 'gig'

// Une scène = un agent avec un artisan, devant son activité. `label` sert de texte alternatif.
export function Scene({ name, label, className }: { name: SceneName; label: string; className?: string }) {
  return (
    <svg className={className ? `lp-scene ${className}` : 'lp-scene'} viewBox="0 0 360 220" role="img" aria-label={label} preserveAspectRatio="xMidYMax slice">
      {name === 'visit' && (
        <>
          <Ground sky="var(--surface-sunk)" />
          <Pickup x={16} />
          {/* artisan qui tient SON téléphone, agent qui montre l'écran */}
          <Person x={226} skin={SKIN[1]} shirt="var(--level-bronze)" pants="var(--ink-muted)" hair={HAIR[0]} hairStyle="cap" pose="phone" />
          <Person x={292} skin={SKIN[0]} shirt="var(--forest)" pants="var(--map-water)" hair={HAIR[3]} hairStyle="bun" pose="point" flip backpack />
          <BrandPin x={238} y={20} scale={1.05} />
        </>
      )}
      {name === 'student' && (
        <>
          <Ground sky="var(--signal-soft)" />
          <Pickup x={10} mixer />
          <Person x={232} skin={SKIN[2]} shirt="var(--ink-muted)" pants="var(--ink)" hair={HAIR[2]} hairStyle="short" vest />
          <Person x={300} skin={SKIN[3]} shirt="var(--success)" pants="var(--map-water)" hair={HAIR[1]} hairStyle="curly" pose="phone" flip backpack />
          <BrandPin x={250} y={18} scale={0.9} />
        </>
      )}
      {name === 'parent' && (
        <>
          <Ground sky="var(--success-soft)" />
          <Tree x={70} />
          <rect x="118" y="150" width="50" height="30" rx="4" fill="var(--signal)" stroke="var(--ink)" strokeWidth="1.5" />
          <path d="M162 150 L184 124 L192 130 L172 156" fill="var(--signal)" stroke="var(--ink)" strokeWidth="1.5" />
          <circle cx="130" cy="182" r="7" fill="var(--ink)" />
          <circle cx="156" cy="182" r="7" fill="var(--ink)" />
          <Person x={236} skin={SKIN[0]} shirt="var(--forest)" pants="var(--ink-muted)" hair={HAIR[1]} hairStyle="short" pose="phone" />
          <Person x={302} skin={SKIN[1]} shirt="var(--level-gold-soft)" pants="var(--ink)" hair={HAIR[0]} hairStyle="bun" pose="point" flip />
          <BrandPin x={150} y={26} scale={0.9} />
        </>
      )}
      {name === 'gig' && (
        <>
          <Ground sky="var(--level-silver-soft)" />
          <House x={20} />
          <Person x={226} skin={SKIN[3]} shirt="var(--signal)" pants="var(--ink)" hair={HAIR[2]} hairStyle="cap" pose="camera" />
          <Person x={296} skin={SKIN[2]} shirt="var(--map-water)" pants="var(--ink-muted)" hair={HAIR[0]} hairStyle="short" flip />
          <BrandPin x={262} y={16} scale={0.9} />
        </>
      )}
    </svg>
  )
}

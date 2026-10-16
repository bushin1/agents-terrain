// Génère tokens.css à partir de tokens.json (le design system MapCrew ne publie que le JSON).
// Usage : node design/mapcrew/build-tokens.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const t = JSON.parse(readFileSync(join(dir, 'tokens.json'), 'utf8'))

const themeVars = (theme) =>
  [
    ...t.color.tokens.map((c) => `  --${c.name}: ${c.value[theme]};`),
    ...t.shadow.tokens.map((s) => `  --${s.name}: ${s.value[theme]};`),
  ].join('\n')

const shared = [
  `  --font-display: ${t.type.families.display};`,
  `  --font-sans: ${t.type.families.sans};`,
  ...t.spacing.tokens.map((s) => `  --${s.name}: ${s.value};`),
  ...t.radius.tokens.map((r) => `  --${r.name}: ${r.value};`),
].join('\n')

const typeClasses = t.type.groups
  .flatMap((g) =>
    g.styles.map((s) => {
      const lines = [
        `font-family: var(--font-${g.family});`,
        `font-size: ${s.fontSize};`,
        `line-height: ${s.lineHeight};`,
        `font-weight: ${s.fontWeight};`,
      ]
      if (s.letterSpacing) lines.push(`letter-spacing: ${s.letterSpacing};`)
      return `.${s.name} { ${lines.join(' ')} }`
    }),
  )
  .join('\n')

const css = `/* Généré par build-tokens.mjs à partir de tokens.json — ne pas modifier à la main. */
:root {
${shared}
}
:root, [data-theme="light"] {
  color-scheme: light;
${themeVars('light')}
}
[data-theme="dark"] {
  color-scheme: dark;
${themeVars('dark')}
}
${typeClasses}
`

writeFileSync(join(dir, 'tokens.css'), css)
console.log(`tokens.css écrit (${css.length} caractères)`)

'use client'
import { useRef, useState } from 'react'

/** 6 cases d'un chiffre ; un collage remplit à partir de la case. Valeur envoyée dans un champ caché `code`. */
export function OtpInput({ onCodeChange }: { onCodeChange?: (code: string) => void }) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function update(next: string[]) {
    setDigits(next)
    onCodeChange?.(next.join('')) // le parent sait à tout moment si les 6 chiffres sont là
  }
  function onChange(i: number, value: string) {
    const clean = value.replace(/\D/g, '')
    // Une seule case contient au plus un chiffre : on garde le chiffre tapé (le dernier) ; un collage
    // de plusieurs chiffres remplit à partir de cette case.
    const typed = clean.length === 2 && digits[i] !== '' ? clean.replace(digits[i], '').slice(-1) || clean.slice(-1) : null
    if (clean.length > 1 && typed === null) {
      const next = [...digits]
      clean.slice(0, 6 - i).split('').forEach((d, k) => { next[i + k] = d })
      update(next)
      refs.current[Math.min(i + clean.length, 5)]?.focus()
      return
    }
    const next = [...digits]
    next[i] = typed ?? clean
    update(next)
    if (next[i] && i < 5) refs.current[i + 1]?.focus()
  }
  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  return (
    <div className="mc-otp">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          value={d}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
      <input type="hidden" name="code" value={digits.join('')} />
    </div>
  )
}

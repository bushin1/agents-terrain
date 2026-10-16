'use client'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/mc/icons'

export function StickyApply() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const hero = document.getElementById('hero-ctas')
    const final = document.getElementById('final-h')
    if (!hero || !final || typeof IntersectionObserver === 'undefined') return
    const seen = new Map<Element, boolean>()
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target, e.isIntersecting)
      const heroVisible = seen.get(hero) ?? true
      const finalVisible = seen.get(final) ?? false
      const heroAbove = hero.getBoundingClientRect().bottom < 0
      setShow(!heroVisible && heroAbove && !finalVisible)
    })
    io.observe(hero)
    io.observe(final)
    return () => io.disconnect()
  }, [])
  return (
    <div className="lp-sticky" data-show={show ? 'true' : 'false'}>
      <a className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block" href="/apply" tabIndex={show ? 0 : -1}>
        Postuler en 5 minutes <Icon name="arrow-right" />
      </a>
    </div>
  )
}

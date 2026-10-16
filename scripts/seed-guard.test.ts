import { describe, expect, it } from 'vitest'
import { assertSeedAllowed } from './seed-guard'

describe('assertSeedAllowed', () => {
  it('accepte une base locale hors production', () => {
    expect(() => assertSeedAllowed({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://marvin@localhost:5432/agents_terrain' })).not.toThrow()
  })
  it('refuse la production et une base distante', () => {
    expect(() => assertSeedAllowed({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://marvin@localhost:5432/agents_terrain' })).toThrow('production')
    expect(() => assertSeedAllowed({ DATABASE_URL: 'postgresql://app:pw@db.example.com:5432/agents_terrain' })).toThrow('base non locale')
    expect(() => assertSeedAllowed({})).toThrow('base non locale')
  })
})

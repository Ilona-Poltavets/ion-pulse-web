import { describe, expect, it } from 'vitest'
import { parsePreferences } from '../readerPreferences'

describe('parsePreferences', () => {
  it('falls back to defaults for missing or broken data', () => {
    const defaults = { theme: 'paper', fontScale: 1, sound: false }
    expect(parsePreferences(null)).toEqual(defaults)
    expect(parsePreferences('{not json')).toEqual(defaults)
    expect(parsePreferences('{"theme":"neon","fontScale":9}')).toEqual(defaults)
  })

  it('keeps valid stored values', () => {
    expect(parsePreferences('{"theme":"night","fontScale":1.25,"sound":true}')).toEqual({
      theme: 'night',
      fontScale: 1.25,
      sound: true,
    })
  })
})

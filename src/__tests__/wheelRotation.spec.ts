import { describe, expect, it } from 'vitest'
import { wheelTargetRotation } from '@/components/roulette/wheelRotation'

describe('roulette wheel rotation', () => {
  it('centres the winning segment under the pointer after four turns', () => {
    const result = wheelTargetRotation(0, 2, 8)
    expect(result).toBe(1687.5)
    expect(result % 360).toBe(247.5)
  })

  it('continues from the current normalized rotation', () => {
    expect(wheelTargetRotation(1687.5, 0, 8)).toBe(3217.5)
  })
})

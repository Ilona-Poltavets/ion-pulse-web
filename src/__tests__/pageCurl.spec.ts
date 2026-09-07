import { describe, expect, it } from 'vitest'
import { pageCurl } from '@/components/journal/pageCurl'

function area(polygon: string) {
  const points = [...polygon.matchAll(/(-?[\d.e+-]+)px (-?[\d.e+-]+)px/g)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ])
  return (
    Math.abs(
      points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length]!
        return sum + point[0]! * next[1]! - next[0]! * point[1]!
      }, 0),
    ) / 2
  )
}
describe('HTML page fold geometry', () => {
  it('starts with the entire front visible and ends with the entire reverse visible', () => {
    const start = pageCurl(600, 780, 0, 0.2)
    const end = pageCurl(600, 780, 1, 0.2)
    expect(area(start.frontClip)).toBeCloseTo(600 * 780)
    expect(area(start.backClip)).toBeCloseTo(0)
    expect(area(end.frontClip)).toBeCloseTo(0)
    expect(area(end.backClip)).toBeCloseTo(600 * 780)
  })
  it.each([-0.22, 0.22])('does not lose or duplicate paper while folding from tilt %s', (tilt) => {
    for (let progress = 0.01; progress < 1; progress += 0.03) {
      const fold = pageCurl(600, 780, progress, tilt)
      expect(area(fold.frontClip) + area(fold.backClip)).toBeCloseTo(600 * 780)
      expect(fold.reflection).not.toMatch(/NaN|Infinity/)
    }
  })
  it('lands the reverse exactly on the opposite page', () => {
    const fold = pageCurl(600, 780, 1, 0.2)
    const matrix = fold.reflection.slice(7, -1).split(',').map(Number)
    expect(matrix[0]).toBeCloseTo(-1)
    expect(matrix[3]).toBeCloseTo(1)
    expect(matrix[4]).toBeCloseTo(0)
    expect(matrix[5]).toBeCloseTo(0)
  })
  it('clamps overshoot when the pointer moves outside the book', () => {
    expect(pageCurl(600, 780, -1, 0.2)).toEqual(pageCurl(600, 780, 0, 0.2))
    expect(pageCurl(600, 780, 2, 0.2)).toEqual(pageCurl(600, 780, 1, 0.2))
  })
})

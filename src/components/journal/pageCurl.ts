type Point = { x: number; y: number }

// Clip the HTML sheet against the crease. Reflect only the folded part.
export function pageCurl(width: number, height: number, progress: number, tilt: number) {
  const p = Math.max(0, Math.min(1, progress))
  const slope = Math.sin(Math.PI * p) * tilt
  const crease = width * (1 - p) + (slope * height) / 2
  const rectangle = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
  function clip(folded: boolean) {
    const points: Point[] = []
    for (let i = 0; i < rectangle.length; i++) {
      const a = rectangle[i]!
      const b = rectangle[(i + 1) % rectangle.length]!
      const da = a.x + slope * a.y - crease
      const db = b.x + slope * b.y - crease
      const inside = folded ? da >= 0 : da <= 0
      if (inside) points.push(a)
      if (inside !== (folded ? db >= 0 : db <= 0)) {
        const ratio = da / (da - db)
        points.push({ x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio })
      }
    }
    return `polygon(${points.map((point) => `${point.x}px ${point.y}px`).join(', ') || '0px 0px, 0px 0px, 0px 0px'})`
  }
  const denominator = 1 + slope * slope
  return {
    frontClip: clip(false),
    backClip: clip(true),
    reflection: `matrix(${1 - 2 / denominator},${(-2 * slope) / denominator},${(-2 * slope) / denominator},${1 - (2 * slope * slope) / denominator},${(2 * crease) / denominator},${(2 * slope * crease) / denominator})`,
    crease: crease - (slope * height) / 2,
    angle: (Math.atan(slope) * 180) / Math.PI,
    lift: Math.sin(Math.PI * p),
  }
}

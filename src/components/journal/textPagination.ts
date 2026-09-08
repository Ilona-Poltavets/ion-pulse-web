function textLength(words: string[]): number {
  return words.reduce((total, word) => total + word.length, 0) + Math.max(0, words.length - 1)
}

function takeClosestChunk(words: string[], target: number): string {
  const chunk: string[] = []
  let length = 0

  while (words.length) {
    const word = words[0]!
    const nextLength = length + (chunk.length ? 1 : 0) + word.length
    if (
      chunk.length &&
      nextLength > target &&
      Math.abs(target - length) <= Math.abs(nextLength - target)
    )
      break
    chunk.push(words.shift()!)
    length = nextLength
  }

  return chunk.join(' ')
}

/** Splits copy into the fewest pages and gives every page a similar fill ratio. */
export function balancedTextChunks(
  value: string,
  firstPageCapacity: number,
  continuationCapacity = firstPageCapacity,
): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []

  const total = textLength(words)
  if (total <= firstPageCapacity) return [words.join(' ')]

  const continuationCount = Math.ceil(Math.max(0, total - firstPageCapacity) / continuationCapacity)
  const capacities = [
    firstPageCapacity,
    ...Array.from({ length: continuationCount }, () => continuationCapacity),
  ]
  const chunks: string[] = []

  for (let index = 0; index < capacities.length - 1; index += 1) {
    const remainingLength = textLength(words)
    const remainingCapacity = capacities.slice(index).reduce((sum, capacity) => sum + capacity, 0)
    const target = Math.max(
      1,
      Math.round((remainingLength * capacities[index]!) / remainingCapacity),
    )
    chunks.push(takeClosestChunk(words, target))
  }
  if (words.length) chunks.push(words.join(' '))

  return chunks.filter(Boolean)
}

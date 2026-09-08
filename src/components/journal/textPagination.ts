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
      chunk[chunk.length - 1] !== PARAGRAPH_BREAK &&
      nextLength > target &&
      Math.abs(target - length) <= Math.abs(nextLength - target)
    )
      break
    chunk.push(words.shift()!)
    length = nextLength
  }

  return restoreParagraphs(chunk.join(' '))
}

const PARAGRAPH_BREAK = '\uE000'

function restoreParagraphs(value: string): string {
  return value.replace(new RegExp(`\\s*${PARAGRAPH_BREAK}\\s*`, 'g'), '\n\n').trim()
}

/** Splits copy into the fewest pages and gives every page a similar fill ratio. */
export function balancedTextChunks(
  value: string,
  firstPageCapacity: number,
  continuationCapacity = firstPageCapacity,
): string[] {
  const words = value
    .trim()
    .replace(/\n\s*\n/g, ` ${PARAGRAPH_BREAK} `)
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return []

  const total = textLength(words)
  if (total <= firstPageCapacity) return [restoreParagraphs(words.join(' '))]

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
  if (words.length) chunks.push(restoreParagraphs(words.join(' ')))

  return chunks.filter(Boolean)
}

export function readerStep(index: number, direction: 1 | -1, mobile: boolean): number {
  if (mobile) return 1
  if ((index === 0 && direction === 1) || (index === 1 && direction === -1)) return 1
  return 2
}

export function canTurnReader(
  index: number,
  direction: 1 | -1,
  total: number,
  mobile: boolean,
): boolean {
  const target = index + direction * readerStep(index, direction, mobile)
  return target >= 0 && target < total
}

export function readerRange(index: number, total: number, mobile: boolean): [number, number] {
  if (mobile || index === 0) return [Math.min(index + 1, total), Math.min(index + 1, total)]
  return [index + 1, Math.min(index + 2, total)]
}

export function normalizeDesktopReaderIndex(index: number): number {
  if (index <= 0) return 0
  return index % 2 === 1 ? index : index - 1
}

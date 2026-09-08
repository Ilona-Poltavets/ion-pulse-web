export function wheelTargetRotation(
  currentRotation: number,
  winnerIndex: number,
  gameCount: number,
): number {
  if (gameCount < 1) return currentRotation
  const slice = 360 / gameCount
  const normalized = ((currentRotation % 360) + 360) % 360
  const target = 360 - (winnerIndex * slice + slice / 2)
  const delta = (target - normalized + 360) % 360
  return currentRotation + 360 * 4 + delta
}

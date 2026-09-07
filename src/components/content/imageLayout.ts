export const imageLayoutAttributes = [
  'data-image-align',
  'data-image-width',
  'data-image-wrap',
  'data-image-gap',
  'data-image-radius',
  'data-image-ratio',
] as const

export function imageLayout(attrs: Record<string, unknown>) {
  const number = (value: unknown, fallback: number, min: number, max: number) => {
    if (value === null || value === undefined || value === '') return fallback
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback
  }
  const align =
    attrs.imageAlign === 'left' || attrs.imageAlign === 'right' ? attrs.imageAlign : 'center'
  return {
    imageAlign: align,
    imageWidth: number(attrs.imageWidth, 100, 10, 100),
    imageWrap: (attrs.imageWrap === true || attrs.imageWrap === 'true') && align !== 'center',
    imageGap: number(attrs.imageGap, 24, 0, 80),
    imageRadius: number(attrs.imageRadius, 4, 0, 80),
    imageRatio: ['16/9', '4/3', '1/1', '3/4'].includes(String(attrs.imageRatio))
      ? String(attrs.imageRatio)
      : 'auto',
  }
}
export function imageLayoutHtml(attrs: Record<string, unknown>) {
  const layout = imageLayout(attrs)
  return {
    'data-image-align': layout.imageAlign,
    'data-image-width': String(layout.imageWidth),
    'data-image-wrap': String(layout.imageWrap),
    'data-image-gap': String(layout.imageGap),
    'data-image-radius': String(layout.imageRadius),
    'data-image-ratio': layout.imageRatio,
    style: `width: ${layout.imageWidth}%; --image-gap: ${layout.imageGap}px; border-radius: ${layout.imageRadius}px; aspect-ratio: ${layout.imageRatio};`,
  }
}
export function readImageLayout(element: HTMLElement) {
  return imageLayout({
    imageAlign: element.getAttribute('data-image-align'),
    imageWidth: element.getAttribute('data-image-width'),
    imageWrap: element.getAttribute('data-image-wrap'),
    imageGap: element.getAttribute('data-image-gap'),
    imageRadius: element.getAttribute('data-image-radius'),
    imageRatio: element.getAttribute('data-image-ratio'),
  })
}

export function journalImageUrl(value: string): string {
  if (!value) return ''
  try {
    const url = new URL(value, window.location.origin)
    if (url.hostname === 'i.playground.ru' && !url.search) url.search = '760xauto'
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : url.href
  } catch {
    return value
  }
}

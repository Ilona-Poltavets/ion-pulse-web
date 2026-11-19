import { reactive, watch } from 'vue'

export type ReaderTheme = 'paper' | 'sepia' | 'night'

export interface ReaderPreferences {
  theme: ReaderTheme
  /** Multiplier for body copy: 1 is the designed size. */
  fontScale: number
  sound: boolean
}

const STORAGE_KEY = 'ion-pulse:reader-preferences'
export const FONT_SCALES = [1, 1.12, 1.25] as const
const DEFAULTS: ReaderPreferences = { theme: 'paper', fontScale: 1, sound: false }

export function parsePreferences(raw: string | null): ReaderPreferences {
  try {
    const value = JSON.parse(raw ?? 'null') as Partial<ReaderPreferences> | null
    return {
      theme: ['paper', 'sepia', 'night'].includes(value?.theme as string)
        ? (value!.theme as ReaderTheme)
        : DEFAULTS.theme,
      fontScale: FONT_SCALES.includes(value?.fontScale as (typeof FONT_SCALES)[number])
        ? (value!.fontScale as number)
        : DEFAULTS.fontScale,
      sound: value?.sound === true,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

function load(): ReaderPreferences {
  try {
    return parsePreferences(localStorage.getItem(STORAGE_KEY))
  } catch {
    return { ...DEFAULTS }
  }
}

const preferences = reactive<ReaderPreferences>(load())
watch(preferences, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Preferences simply will not persist when storage is unavailable.
  }
})

export function useReaderPreferences(): ReaderPreferences {
  return preferences
}

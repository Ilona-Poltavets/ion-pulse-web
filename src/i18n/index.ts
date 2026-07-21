import { createI18n } from 'vue-i18n'

import { messages } from './messages'

export type SupportedLocale = 'ru' | 'en'

const storedLocale = localStorage.getItem('ion-pulse-locale')
const initialLocale: SupportedLocale = storedLocale === 'en' ? 'en' : 'ru'

document.documentElement.lang = initialLocale

const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages,
})

export default i18n

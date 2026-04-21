import { createI18n } from 'vue-i18n'
import en from './en.json'
import de from './de.json'

const savedLocale = localStorage.getItem('locale') ?? 'en'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, de },
})

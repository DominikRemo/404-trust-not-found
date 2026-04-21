import { ref, watch } from 'vue'
import { i18n } from '../i18n/index.js'

const SUPPORTED = ['en', 'de']
const locale = ref(localStorage.getItem('locale') ?? 'en')

watch(locale, (lang) => {
  i18n.global.locale.value = lang
  localStorage.setItem('locale', lang)
})

export function useLocale() {
  function setLocale(lang) {
    if (SUPPORTED.includes(lang)) locale.value = lang
  }
  return { locale, setLocale, SUPPORTED }
}

import { ref, computed, watchEffect } from 'vue'

const systemQuery = window.matchMedia('(prefers-color-scheme: dark)')
const systemIsDark = ref(systemQuery.matches)
systemQuery.addEventListener('change', (e) => { systemIsDark.value = e.matches })

const theme = ref(localStorage.getItem('theme') ?? 'system') // 'light' | 'dark' | 'system'

const isDark = computed(() =>
  theme.value === 'system' ? systemIsDark.value : theme.value === 'dark'
)

watchEffect(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
})

const CYCLE = { system: 'light', light: 'dark', dark: 'system' }

export function useTheme() {
  function cycleTheme() {
    theme.value = CYCLE[theme.value]
    if (theme.value === 'system') {
      localStorage.removeItem('theme')
    } else {
      localStorage.setItem('theme', theme.value)
    }
  }
  return { theme, isDark, cycleTheme }
}
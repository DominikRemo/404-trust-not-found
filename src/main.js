import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'
import './style.css'
import App from './App.vue'

const GameTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
  },
})

createApp(App)
  .use(PrimeVue, {
    theme: {
      preset: GameTheme,
      options: { darkModeSelector: '.dark' },
    },
  })
  .mount('#app')

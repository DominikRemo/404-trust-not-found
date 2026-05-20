import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'
import './style.css'
import App from './App.vue'
import { i18n } from './i18n/index.js'

const GameTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#eef0f5',
      100: '#d4d9e3',
      200: '#aab3c8',
      300: '#7c8aab',
      400: '#56688d',
      500: '#3a4d72',
      600: '#2a3a5a',
      700: '#1c2747',
      800: '#141d38',
      900: '#0d152a',
      950: '#07101d',
    },
  },
  components: {
    button: {
      colorScheme: {
        dark: {
          root: {
            primary: {
              background: '{primary.200}',
              hoverBackground: '{primary.100}',
              activeBackground: '{primary.300}',
              borderColor: '{primary.200}',
              hoverBorderColor: '{primary.100}',
              activeBorderColor: '{primary.300}',
              color: '{primary.950}',
              hoverColor: '{primary.950}',
              activeColor: '{primary.950}',
            },
          },
        },
      },
    },
  },
})

createApp(App)
  .use(i18n)
  .use(PrimeVue, {
    theme: {
      preset: GameTheme,
      options: { darkModeSelector: '.dark' },
    },
  })
  .mount('#app')

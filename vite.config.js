import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/404-trust-not-found/',
  plugins: [vue(), tailwindcss()],
})

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The review code shared with the edge functions (D24).
export const alias = { '@review': fileURLToPath(new URL('./supabase/functions/_shared/review', import.meta.url)) }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias },
})

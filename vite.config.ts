import { cpSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The review code shared with the edge functions (D24).
export const alias = { '@review': fileURLToPath(new URL('./supabase/functions/_shared/review', import.meta.url)) }

// Excalidraw fonts are served by the app, not fetched from esm.sh (index.html sets EXCALIDRAW_ASSET_PATH = '/').
// Copied from the package at dev and build start; public/fonts is gitignored (13 MB, D33).
const excalidrawFonts = (): Plugin => ({
  name: 'excalidraw-fonts',
  buildStart() {
    const to = fileURLToPath(new URL('./public/fonts', import.meta.url))
    cpSync(fileURLToPath(new URL('./node_modules/@excalidraw/excalidraw/dist/prod/fonts', import.meta.url)), to, { recursive: true, force: true })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), excalidrawFonts()],
  resolve: { alias },
})

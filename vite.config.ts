import { cpSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
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

// `vite preview` (and so every e2e run) serves the production headers from vercel.json (D37), with the local
// Supabase added to connect-src. Not in `vite dev`: its HMR client needs inline scripts and a websocket.
const productionHeaders = (supabaseUrl: string | undefined) => {
  const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
  const headers: Record<string, string> = Object.fromEntries(vercel.headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]))
  if (supabaseUrl && !supabaseUrl.startsWith('https://'))
    headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace("connect-src 'self'", `connect-src 'self' ${supabaseUrl}`)
  return headers
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), excalidrawFonts()],
  resolve: { alias },
  preview: { headers: productionHeaders(process.env.VITE_SUPABASE_URL ?? loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL) },
}))

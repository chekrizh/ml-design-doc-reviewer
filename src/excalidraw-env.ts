// Excalidraw loads its fonts from the app (public/fonts, D33), not from a CDN. A module rather than an inline
// <script> in index.html, so the CSP needs no 'unsafe-inline' for scripts (D37). Imported first in main.tsx;
// Excalidraw itself is loaded lazily, after this has run.
;(window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH = '/'

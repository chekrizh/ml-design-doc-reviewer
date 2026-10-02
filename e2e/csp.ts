import type { BrowserContext } from '@playwright/test'

/**
 * Collects Content-Security-Policy violations from every page of the context (D37): the preview server sends
 * the production CSP, so a blocked script, style, image or request here would be blocked in production too.
 */
export async function collectCspViolations(context: BrowserContext) {
  const seen: string[] = []
  await context.exposeBinding('__cspViolation', (_source, v: string) => {
    // Excalidraw lists esm.sh as the last fallback in every font's src. Fonts load from the app first
    // (D33, checked in csp.spec.ts), so the fallback is never fetched, but browsers still report it.
    if (!v.startsWith('font-src blocked https://esm.sh/@excalidraw/')) seen.push(v)
  })
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { __cspViolation: (v: string) => void }).__cspViolation(`${e.effectiveDirective} blocked ${e.blockedURI || '(inline)'}`),
    )
  })
  return seen
}

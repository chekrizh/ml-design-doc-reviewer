import type { SectionId } from '../model/design'

// Simple stroke icons in the spirit of the mockup (lucide-style paths). Scales are reserved for the
// trade-offs status icon, so no section uses them.
const ICONS: Record<SectionId, { name: string; d: string }> = {
  'problem-space': { name: 'flag', d: 'M4 22V15M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' },
  'evaluation-offline': { name: 'trend', d: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
  baseline: { name: 'anchor', d: 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 22V8M5 12H2a10 10 0 0 0 20 0h-3' },
  validation: { name: 'archive', d: 'M4 4h16v5H4zM6 9v11h12V9M10 13h4' },
  'data-features': { name: 'database', d: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3' },
  'evaluation-online': { name: 'flask', d: 'M10 2v7.5L4.5 19A2 2 0 0 0 6.2 22h11.6a2 2 0 0 0 1.7-3L14 9.5V2M8.5 2h7M7 16h10' },
  integration: { name: 'sliders', d: 'M5 3v18M12 3v18M19 3v18M3 8h4M10 15h4M17 10h4' },
  monitoring: { name: 'chart', d: 'M3 3v18h18M7 15l4-4 3 3 5-6' },
  'target-solution': { name: 'target', d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
}

export function SectionIcon({ id, className = 'h-5 w-5' }: { id: SectionId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden data-icon={ICONS[id].name}>
      <path d={ICONS[id].d} />
    </svg>
  )
}

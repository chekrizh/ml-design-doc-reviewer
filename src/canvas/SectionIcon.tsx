import type { SectionId } from '../model/design'

// Simple stroke icons in the spirit of the mockup (lucide-style paths).
const PATHS: Record<SectionId, string> = {
  'problem-space': 'M12 2a10 10 0 1 0 10 10M12 6a6 6 0 1 0 6 6M12 10a2 2 0 1 0 2 2',
  'evaluation-offline': 'M3 17l6-6 4 4 8-8M15 7h6v6',
  baseline: 'M12 3v18M5 7h14M5 7l-3 7h6zM19 7l-3 7h6zM8 21h8',
  validation: 'M4 4h16v5H4zM6 9v11h12V9M10 13h4',
  'data-features': 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  'evaluation-online': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20',
  integration: 'M5 3v18M12 3v18M19 3v18M3 8h4M10 15h4M17 10h4',
  monitoring: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  'target-solution': 'M5 19c1-4 3-7 7-9M12 10l3-7 6 6-7 3zM9 15l-4 4',
}

export function SectionIcon({ id, className = 'h-5 w-5' }: { id: SectionId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[id]} />
    </svg>
  )
}

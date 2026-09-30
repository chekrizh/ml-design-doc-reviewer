# Open Questions

Conflicts between `docs/mvp-spec.md`, `features.json` and `docs/acceptance-tests.md`, and differences from the mockups, that the agent must not resolve on its own. The human answers here.

Format:

```
## <feature-id or AT-id>: <short title>
- Conflict: <what disagrees with what>
- What I did meanwhile: <skipped / followed spec / ...>
```

<!-- Entries start below. -->

## ui-02: Differences between screenshots (`e2e/screenshots/`) and `docs/mockups/`
- Conflict: none blocking; visual differences noted for the human review.
- Canvas (`canvas.png`):
  - Header has no avatars or Share (per spec); instead it has Load example, Reset layout, Export Markdown, Export PDF and a small "Saved" autosave status.
  - Footer indicators are text badges (off: grey, on: violet) without the mockup's small icons; Details is always dark. In the mockup Details is sometimes light — spec defines only indicator states, so Details is styled the same everywhere.
  - Target Solution & Architecture shows key properties as rows like other cards; the mockup stacks them with small uppercase labels.
  - Diagram thumbnails are Excalidraw SVG exports; the mockup's chips (Data & Features) and bar chart (Monitoring) are custom visuals, not reproduced. Thumbnail text uses a fallback serif font because fonts are not inlined (inlining would fetch fonts from a CDN).
  - Cards leave empty space under 2–3 key properties; mockup cards look denser.
- Component Editor (`component-editor.png`):
  - No "Architecture Component" subtitle under the title and no table/pencil jump buttons next to "Saved to Canvas"; not in the spec.
  - Whiteboard part is added at the bottom (spec: "нет на мокапе").
  - Toolbar icons are text glyphs (B, I, <>, •≡, 1., 🔗, 🖼) rather than an icon set; no icon library is in `docs/decisions.md`.
- Document (`document.png`):
  - The big heading is the design title and "ML System Architecture Spec" is the subtitle (per spec); the mockup shows "ML System Architecture Spec" as the heading.
  - No "Contributors" meta; "Last updated" is an absolute date, the mockup shows relative ("2 hrs ago").
  - Header keeps Export Markdown next to Export PDF (spec: both exports in the header).
  - TOC active entry has no chevron.
- What I did meanwhile: followed the spec where it differs from the mockups; left the rest as is.

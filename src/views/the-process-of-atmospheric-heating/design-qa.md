# Design QA — 大气受热过程 2D SVG

## Source of truth

- Reference screenshot: `C:\Users\bearx\AppData\Local\Temp\codex-clipboard-248b915a-8c0d-4efe-9ef4-f76fd122898c.png`
- Reference intent: use the energy-budget teaching structure only; do not reproduce its composition, percentage columns, or arrow layout.
- Implementation screenshot: `C:\Users\bearx\.codex\visualizations\2026\09\04\01a06c1a-e36c-7f73-9a88-8d8ee9aebf95\atmospheric-heating-2d-stage6.png`
- Combined comparison: `C:\Users\bearx\.codex\visualizations\2026\09\04\01a06c1a-e36c-7f73-9a88-8d8ee9aebf95\atmospheric-heating-2d-comparison.png`
- Scatter reference: `C:\Users\bearx\AppData\Local\Temp\codex-clipboard-40f2699c-b9a0-4e41-af80-2ed2f04c7368.png`
- Scatter implementation: `C:\Users\bearx\.codex\visualizations\2026\09\04\01a06c1a-e36c-7f73-9a88-8d8ee9aebf95\atmospheric-heating-2d-scatter-burst.png`
- Scatter focused comparison: `C:\Users\bearx\.codex\visualizations\2026\09\04\01a06c1a-e36c-7f73-9a88-8d8ee9aebf95\atmospheric-heating-2d-scatter-comparison.png`

## Target viewport and state

- Browser: Codex in-app browser.
- Captured viewport: 1345 × 1432.
- State: `2D 图解`; primary capture is stage 6 at 66%, with both sensible-heat and latent-heat paths visible; focused scatter capture is stage 2 at 17%.
- Additional states checked: initial solar input, land longwave, stage 6 before/after the second path appears, dynamic balance, and switching 3D → 2D → 3D → 2D.

## Reference dimensions

- Reference image: 2282 × 1225.
- Implementation screenshot: 1345 × 1432.
- SVG coordinate system: 1200 × 680 with `xMidYMid meet`, preserving the full diagram without cropping.

## Implementation geometry and typography

- Main scene: full workspace inset; SVG scales to 100% width and height.
- Arrow shaft: 8 SVG units; glow halo: 19 SVG units; arrow markers: 10 × 10.
- Callout title: 14 SVG px / 800 weight; callout explanation: 10 SVG px / 500 weight.
- Surface labels: 15 SVG px / 700 weight; atmosphere key: 13 SVG px / 700 weight.
- Font stack: Microsoft YaHei, sans-serif.
- Responsive behavior: complete SVG remains visible at tall and narrow desktop panes; floating control panel remains independently movable/collapsible.

## Five-surface comparison

1. Content: preserves the same core teaching concepts (shortwave input, atmospheric weakening, surface absorption, longwave release, sensible/latent heat, atmospheric radiation, back radiation) without copying the reference percentages or wording layout.
2. Structure: uses a curved atmospheric cross-section, split ocean/land horizon, and one active path per sub-stage; clearly distinct from the reference's flat sky, baseline, and oversized vertical percentage columns.
3. Style: intentionally follows the existing product's dark cyan/orange visual language instead of the reference's light-blue classroom slide styling.
4. Geometry: long directional arrows remain close to their labels; wavy paths are reserved for sensible and latent heat; radiation, reflection, and refraction remain single paths; molecular scattering intentionally branches from one center into five slim directions.
5. Behavior: all nine stages, group navigation, scrubber, stage playback, loop, continuous playback, and 3D/2D switching remain operational.

## Verification history

- Pass 1: found `slice` scaling cropped the sun and labels in a tall browser pane. Changed to `meet` scaling.
- Pass 2: found SVG CSS transforms displaced rotating sun rays and animated labels. Added `transform-box: fill-box` for rays and changed label entrance to opacity-only.
- Pass 3: found the dynamic-balance phase crowded four arrows and overlapping labels. Split the cycle into six smaller semantic groups with at most two heat-transfer arrows together (three only for spatially separated solar inputs).
- Pass 4: verified focused Vue type checking, `git diff --check`, browser console errors (none), staged motion, and mode switching.
- Pass 5: corrected the ocean/land overlap by giving both fills one shared curved coastline; removed the rectangular land intrusion and rechecked the live 2D view with no console errors.
- Pass 6: matched the supplied scatter motif with one incoming shortwave path, a pulsing scatter center, and five staggered animated branches; focused comparison confirmed the flower-like structure remains readable without changing other arrow types. Browser console errors remained empty.

## Final result

passed

# Synqed brand assets

Fixed product identity. The angular **S** monogram + the **synqed** wordmark
set in [Orbitron](https://fonts.google.com/specimen/Orbitron) (self-hosted at
`dashboard/public/fonts/orbitron.woff2`).

## Colours
| Token | Hex | Use |
|---|---|---|
| Navy | `#030114` | mark body on light backgrounds, tile background |
| Violet | `#6C35F7` | accent (light contexts) |
| Violet (bright) | `#8B5CF6` | accent on dark backgrounds |
| White | `#FFFFFF` | mark body on dark backgrounds |

## Files
| File | Use |
|---|---|
| `synqed-mark.svg` | mark for **light** backgrounds (navy + violet) |
| `synqed-mark-ondark.svg` | mark for **dark** backgrounds (white + bright violet) |
| `synqed-mark-mono-white.svg` / `-navy.svg` | single-colour stamps for tiny sizes |
| `synqed-tile-navy.svg` / `-purple.svg` / `-light.svg` | app icon / avatar / favicon source |
| `synqed-mark-source.svg` | original generator export (kept for reference) |

In the dashboard the sidebar mark is inlined (`src/components/synqed-brand.tsx`)
so its body inherits `currentColor` and adapts to the theme automatically;
the favicon is rendered from `synqed-tile-navy.svg`.

# Animation Design System

Ein konsistentes, smooth Animation-System für das Schedule Bot Dashboard - basierend auf Tailwind CSS und CSS Custom Properties.

## 📋 Übersicht

Das Animation-System bietet:
- **Design Tokens** für konsistente Timing und Easing
- **Utility Classes** für häufige Animationen
- **TypeScript Helpers** für dynamische Animationen
- **Stagger Patterns** für Listen und Grids
- **Micro-Interactions** für besseres UX
- **Accessibility** - Respektiert `prefers-reduced-motion`

## 🎨 Design Tokens

Alle Animationen nutzen standardisierte Design Tokens aus `globals.css`:

### Timing
```css
--anim-duration-instant: 100ms  /* Sofortiges Feedback */
--anim-duration-fast: 200ms     /* Schnelle Transitions */
--anim-duration-normal: 300ms   /* Standard Animationen */
--anim-duration-slow: 400ms     /* Eingangs-Animationen */
--anim-duration-slower: 500ms   /* Dramatische Effekte */
```

### Easing
```css
--anim-ease-smooth: cubic-bezier(0.16, 1, 0.3, 1)        /* Snappy bounce */
--anim-ease-elastic: cubic-bezier(0.68, -0.55, 0.265, 1.55) /* Elastic overshoot */
--anim-ease-out: cubic-bezier(0.33, 1, 0.68, 1)         /* Smooth deceleration */
--anim-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)      /* Symmetric ease */
--anim-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)   /* Spring bounce */
```

### Stagger Speeds
```css
--anim-stagger-fast: 30ms   /* Für lange Listen */
--anim-stagger-base: 50ms   /* Standard */
--anim-stagger-slow: 75ms   /* Für Cards/Sections */
```

## 🚀 Verwendung

### 1. Basis Animationen (CSS)

Einfach Klassen hinzufügen:

```tsx
// Fade in
<div className="animate-fadeIn">Content</div>

// Slide up
<div className="animate-slideUp">Content</div>

// Scale in mit bounce
<div className="animate-scaleBounce">Content</div>

// Fast variant
<div className="animate-fadeIn-fast">Quick feedback</div>
```

### 2. Stagger Animationen

Für Listen mit Cascade-Effekt:

```tsx
// Manuell
<div className="animate-slideUp stagger-1">Item 1</div>
<div className="animate-slideUp stagger-2">Item 2</div>
<div className="animate-slideUp stagger-3">Item 3</div>

// Mit TypeScript Helper
import { stagger } from "@/lib/animations";

{items.map((item, index) => (
  <div key={item.id} className={stagger(index, "fast", "slideUp")}>
    {item.name}
  </div>
))}
```

### 3. TypeScript Helpers

Importiere aus `@/lib/animations`:

```tsx
import {
  stagger,
  animate,
  presets,
  microInteractions,
  cn
} from "@/lib/animations";

// Stagger für Listen
<div className={stagger(index, "fast", "slideUp")}>

// Animation Builder
<div className={animate("scaleIn", { stagger: 2, speed: "base" })}>

// Presets
<Card className={presets.card}> {/* hover-lift + transitions */}
<Button className={presets.button}> {/* press effect */}

// Micro-interactions
<div className={microInteractions.hoverLift}>
<div className={microInteractions.activePress}>

// Kombinieren
<div className={cn(
  presets.cardEntrance,
  stagger(index, "slow"),
  microInteractions.hoverLift
)}>
```

### 4. Grid Stagger

Für 2D Grids mit gestaffelten Animationen:

```tsx
import { gridStagger } from "@/lib/animations";

<div className="grid grid-cols-3 gap-4">
  {items.map((item, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    return (
      <Card
        key={item.id}
        className={gridStagger(row, col, 3, "fast", "scaleIn")}
      >
        {item.name}
      </Card>
    );
  })}
</div>
```

## 📦 Verfügbare Animationen

### Entry Animations
| Klasse | Beschreibung | Duration |
|--------|-------------|----------|
| `animate-fadeIn` | Opacity fade | 300ms |
| `animate-fadeIn-fast` | Schneller fade | 200ms |
| `animate-fadeIn-slow` | Langsamer fade | 500ms |
| `animate-slideUp` | Von unten nach oben | 400ms |
| `animate-slideDown` | Von oben nach unten | 300ms |
| `animate-slideLeft` | Von rechts nach links | 300ms |
| `animate-slideRight` | Von links nach rechts | 300ms |
| `animate-scaleIn` | Scale 0.95 → 1 | 300ms |
| `animate-scaleIn-fast` | Schneller scale | 200ms |
| `animate-scaleBounce` | Mit elastic bounce | 500ms |
| `animate-slideUpScale` | Kombination | 400ms |

### Exit Animations
| Klasse | Beschreibung |
|--------|-------------|
| `animate-fadeOut` | Opacity ausblenden |
| `animate-scaleOut` | Scale 1 → 0.95 |

### Loading States
| Klasse | Beschreibung |
|--------|-------------|
| `animate-shimmer` | Shimmer Effekt |
| `animate-pulse` | Pulsing opacity |
| `skeleton-pulse` | Skeleton loader |

### Special Effects
| Klasse | Beschreibung |
|--------|-------------|
| `animate-wiggle` | Kleine Rotation |
| `animate-shake` | Horizontal shake |

## 🎯 Micro-Interactions

Für besseres UX bei interaktiven Elementen:

```tsx
import { microInteractions } from "@/lib/animations";

// Lift effect beim hover
<Card className={microInteractions.hoverLift}>

// Scale beim hover
<div className={microInteractions.hoverScale}>

// Subtiler scale
<div className={microInteractions.hoverScaleSm}>

// Press effect
<Button className={microInteractions.activePress}>

// Smooth transitions
<div className={microInteractions.smooth}>

// Focus ring
<Input className={microInteractions.focusRing}>
```

## 🎨 Presets

Vorgefertigte Kombinationen für häufige Patterns:

```tsx
import { presets } from "@/lib/animations";

// Card mit entrance + hover
<Card className={presets.cardEntrance}>

// Modal entrance
<Dialog className={presets.modalEntrance}>

// List item
<li className={presets.listItem}>

// Section entrance
<section className={presets.sectionEntrance}>

// Alert/Toast
<Alert className={presets.alertEntrance}>

// Interactive button
<Button className={presets.button}>

// Hoverable card
<Card className={presets.card}>
```

## 📱 Responsive & Accessibility

### Reduced Motion
Das System respektiert automatisch `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  /* Alle Animationen werden minimal (0.01ms) */
}
```

### Performance
- Alle Animationen nutzen `transform` und `opacity` (GPU-accelerated)
- `animation-fill-mode: both` verhindert Flash of Unstyled Content
- Keine teuren properties wie `box-shadow` in Keyframes

## 💡 Best Practices

### 1. Konsistente Timing
```tsx
// ✅ Gut - nutzt Design Tokens
<div className="animate-fadeIn">

// ❌ Schlecht - custom timing
<div style={{ animation: "fadeIn 250ms" }}>
```

### 2. Stagger für Listen
```tsx
// ✅ Gut - Stagger für visuelle Hierarchie
{items.map((item, i) => (
  <div className={stagger(i, "fast", "slideUp")}>
))}

// ❌ Schlecht - alle gleichzeitig
{items.map(item => (
  <div className="animate-slideUp">
))}
```

### 3. Kombiniere Animationen + Interactions
```tsx
// ✅ Gut - Eingang + Hover
<Card className={cn(
  "animate-slideUp",
  stagger(index, "slow"),
  microInteractions.hoverLift
)}>

// ❌ Okay - nur Eingang
<Card className="animate-slideUp">
```

### 4. Richtige Speed wählen
```tsx
// ✅ Schnell für Feedback
<Button className={presets.button}> {/* activePress = instant */}

// ✅ Normal für Content
<div className="animate-fadeIn"> {/* 300ms */}

// ✅ Slow für Hero Sections
<Hero className="animate-fadeIn-slow"> {/* 500ms */}
```

### 5. Conditional Animations
```tsx
import { conditionalAnimate } from "@/lib/animations";

<div className={conditionalAnimate(isLoading, "pulse")}>
```

## 🎬 Beispiele

### Dashboard Stats Cards
```tsx
import { stagger, microInteractions, cn } from "@/lib/animations";

const stats = [/* ... */];

return (
  <div className="grid grid-cols-4 gap-4">
    {stats.map((stat, i) => (
      <Card
        key={stat.id}
        className={cn(
          stagger(i, "slow", "slideUpScale"),
          microInteractions.hoverLift
        )}
      >
        <CardContent>{stat.value}</CardContent>
      </Card>
    ))}
  </div>
);
```

### Sidebar Navigation
```tsx
import { stagger, microInteractions } from "@/lib/animations";

{navItems.map((item, i) => (
  <Button
    key={item.id}
    className={cn(
      stagger(i, "fast", "fadeIn"),
      microInteractions.smooth,
      microInteractions.hoverScaleSm
    )}
  >
    {item.label}
  </Button>
))}
```

### Modal mit Animation
```tsx
import { presets } from "@/lib/animations";

<Dialog>
  <DialogContent className={presets.modalEntrance}>
    <DialogTitle className="animate-fadeIn stagger-1">
      Title
    </DialogTitle>
    <DialogDescription className="animate-fadeIn stagger-2">
      Description
    </DialogDescription>
  </DialogContent>
</Dialog>
```

### Loading Skeleton
```tsx
import { loadingStates } from "@/lib/animations";

{isLoading ? (
  <div className={loadingStates.skeleton}>Loading...</div>
) : (
  <div className="animate-fadeIn">{content}</div>
)}
```

## 🔧 Customization

Passe Design Tokens in `globals.css` an:

```css
:root {
  /* Schnellere Animationen für gesamte App */
  --anim-duration-normal: 250ms; /* statt 300ms */

  /* Mehr Bounce */
  --anim-ease-smooth: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Langsamere Staggers */
  --anim-stagger-base: 75ms; /* statt 50ms */
}
```

## 📊 Cheat Sheet

```tsx
import { stagger, animate, presets, microInteractions, cn } from "@/lib/animations";

// Liste mit Stagger
{items.map((item, i) => <div className={stagger(i, "fast", "slideUp")} />)}

// Card mit Entrance + Hover
<Card className={cn(presets.cardEntrance, microInteractions.hoverLift)} />

// Button mit Press
<Button className={presets.button} />

// Conditional Loading
<div className={isLoading ? "animate-pulse" : "animate-fadeIn"} />

// Grid Stagger
const row = Math.floor(i / cols);
const col = i % cols;
<div className={gridStagger(row, col, cols, "base", "scaleIn")} />
```

## 🚨 Troubleshooting

### Animation läuft nicht
1. Prüfe ob `globals.css` importiert ist in `layout.tsx`
2. Prüfe Browser DevTools für `prefers-reduced-motion`
3. Prüfe ob Klasse richtig geschrieben ist

### Stagger funktioniert nicht
1. Stelle sicher, dass auch die Animation-Klasse gesetzt ist
2. Nutze `stagger(index, speed, animation)` mit allen 3 Parametern

### Performance Probleme
1. Nutze `fast` stagger für lange Listen (>10 Items)
2. Vermeide Animationen auf sehr vielen Elementen gleichzeitig
3. Nutze `will-change: transform` bei komplexen Animationen

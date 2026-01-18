# Visual Animation Guide

## User Experience Journey

### 1. **Landing on Home Page**
```
Timeline:
0.0s → Header slides down from top (Team Schedule title)
0.05s → Legend fades in below header
0.1s → First calendar card slides up
0.13s → Second calendar card slides up
0.16s → Third calendar card slides up
... (cascading effect continues for all cards)
```

**What the user sees:**
- Smooth, professional page load
- Content appears in a logical order (top to bottom)
- Cards appear with a pleasant "wave" effect

### 2. **Hovering Over Calendar Cards**
```
User hovers → Card smoothly:
- Scales up to 103%
- Lifts 4px upward
- Shadow intensifies
Duration: 300ms
```

**What the user sees:**
- Clear visual feedback that the card is interactive
- Card "lifts" from the page
- Feels responsive and polished

### 3. **Clicking a Calendar Date**
```
Click → Dialog appears:
0.0s → Overlay fades in
0.0s → Dialog scales from 95% to 100% while fading in
0.1s → Available players list starts appearing
0.1s → First player slides up
0.15s → Second player slides up
0.2s → Third player slides up
... (staggered appearance)
```

**What the user sees:**
- Dialog "pops" into view naturally
- Player list loads with smooth stagger
- Never feels abrupt or jarring

### 4. **Status Card Loading (Admin Page)**
```
Page load:
0.0s → Card fades in
0.05s → First status item (Running/Offline) slides up
0.1s → Second item (Uptime) slides up
0.15s → Third item (API Server) slides up
0.2s → Fourth item (Connection) slides up
```

**What the user sees:**
- Information reveals progressively
- Creates sense of data "loading in"
- Professional dashboard feel

### 5. **Login Page Experience**
```
Page load:
0.0s → Header slides down
0.2s → Login card scales in from 95%
```

**What the user sees:**
- Clean, professional entrance
- Focus immediately drawn to login form
- Modern app feel

### 6. **User Schedule - Selecting Items**
```
First item selected → Bulk actions bar slides up from bottom
More items selected → Count updates smoothly
Hover over row → Row scales to 102%
```

**What the user sees:**
- Immediate feedback when selecting
- Bulk actions appear contextually
- Hover states guide interaction

## Animation Characteristics

### Timing
- **Fast**: 300-400ms for immediate interactions (hover, clicks)
- **Medium**: 500-600ms for page elements
- **Stagger**: 30-50ms between sequential items

### Easing
- **Spring-like**: cubic-bezier(0.16, 1, 0.3, 1)
  - Starts slow
  - Accelerates quickly
  - Slight "bounce" at end
  - Feels natural and organic

### Movement
- **Y-axis**: Most animations (slide up/down)
- **Scale**: For emphasis (dialogs, cards)
- **Opacity**: Always combined with movement

## Visual Comparison

### Before (No Animations)
```
Page load: ████████████ (everything appears at once)
Click: ████ (dialog pops in abruptly)
Hover: (no feedback)
```

### After (With Animations)
```
Page load: █▓▓▒▒░░     (progressive reveal)
Click: ░▒▓█ (smooth scale-in)
Hover: ↑ ⬆ ⤴ (lift effect)
```

## Color-Coded Animation Map

### Home Page (`/`)
```
┌──────────────────────────────────┐
│ [Header - slideDown]             │ ← 0.0s
├──────────────────────────────────┤
│ [Legend - fadeIn + stagger-1]    │ ← 0.05s
├──────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│ │Card │ │Card │ │Card │ │Card │ │ ← slideUp + cascade
│ │0ms  │ │30ms │ │60ms │ │90ms │ │
│ └─────┘ └─────┘ └─────┘ └─────┘ │
│ [Scale up on hover: 103%]        │
└──────────────────────────────────┘
```

### Dialog (Date Details)
```
┌────────────────────────────┐
│ [Dialog - scaleIn @ 0ms]   │
│                            │
│ Available Players:         │
│ ┌────────────────────────┐ │
│ │ Player 1  [0ms]        │ │ ← slideUp
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Player 2  [50ms]       │ │ ← slideUp
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Player 3  [100ms]      │ │ ← slideUp
│ └────────────────────────┘ │
└────────────────────────────┘
```

### Admin Status Card
```
┌──────────────────────────────────────────┐
│ [Card - fadeIn]                          │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────┐ │
│ │Running │ │Uptime  │ │API     │ │Conn││
│ │50ms    │ │100ms   │ │150ms   │ │200││ ← stagger
│ └────────┘ └────────┘ └────────┘ └────┘ │
└──────────────────────────────────────────┘
```

## Accessibility Consideration

### With Motion Enabled (Default)
```css
animation-duration: 0.5s;
transition: all 300ms;
```

### With `prefers-reduced-motion`
```css
animation-duration: 0.01ms !important;
transition-duration: 0.01ms !important;
```

Result: Animations essentially disabled, content appears instantly.

## Summary

The animations create a **cohesive, professional experience** where:
1. **Information reveals progressively** (not all at once)
2. **User actions have immediate visual feedback**
3. **Navigation feels smooth and intentional**
4. **The interface feels responsive and modern**
5. **Accessibility is maintained** for all users

All while being **subtle enough** not to distract from the actual content and functionality.

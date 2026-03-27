# Komponenten

## UI-Primitives

Das Dashboard nutzt **35 Radix UI Komponenten** als Basis, gestylt mit Tailwind CSS (shadcn/ui Pattern):

### Interaktive Elemente
| Komponente | Beschreibung |
|------------|-------------|
| `Button` | Standard-Button mit Varianten (default, destructive, outline, ghost) |
| `LoadingButton` | Button mit Lade-Zustand |
| `Input` | Text-Eingabefeld |
| `Label` | Formular-Label |
| `Checkbox` | Checkbox mit Label |
| `Switch` | Toggle-Switch |
| `Slider` | Schieberegler |
| `Select` | Dropdown-Auswahl |

### Layout
| Komponente | Beschreibung |
|------------|-------------|
| `Card` | Karten-Container (Header, Content, Footer) |
| `Sidebar` | Kollabierbare Seitenleiste |
| `Tabs` | Tab-Navigation |
| `Accordion` | Aufklappbare Sektionen |
| `Collapsible` | Ein-/ausblendbar |
| `Separator` | Horizontale Trennlinie |
| `ScrollArea` | Scrollbarer Bereich mit Custom-Scrollbar |
| `Sheet` | Mobile Drawer (von der Seite) |
| `Table` | Daten-Tabelle |

### Overlays
| Komponente | Beschreibung |
|------------|-------------|
| `Dialog` | Modal-Dialog |
| `AlertDialog` | Bestaetigungs-Dialog |
| `ConfirmDialog` | Vereinfachter Bestaetigungs-Dialog |
| `Popover` | Popup-Inhalt |
| `Tooltip` | Hover-Tooltip |
| `DropdownMenu` | Dropdown-Menu |
| `ContextMenu` | Rechtsklick-Menu |

### Daten
| Komponente | Beschreibung |
|------------|-------------|
| `Avatar` | Benutzer-Avatar (Bild + Fallback) |
| `Badge` | Status-Badge |
| `Breadcrumb` | Breadcrumb-Navigation |
| `Chart` | Recharts-Wrapper mit Legend und Tooltip |
| `Command` | Command-Palette (cmdk) |

### Spezial
| Komponente | Beschreibung |
|------------|-------------|
| `TimezonePicker` | Zeitzonen-Auswahl mit Suche |
| `PageSpinner` | Ganzseitige Lade-Animation |
| `Sonner` | Toast-Benachrichtigungen |

## Geteilte Komponenten

### `nav-user.tsx`
Benutzer-Info im Sidebar-Footer mit:
- Avatar, Name, Rolle
- Logout-Funktion

### `sidebar-branding-header.tsx`
Team-Branding im Sidebar-Header:
- Logo (wenn URL konfiguriert)
- Team-Name
- Tagline

### `sidebar-nav-group.tsx`
Navigations-Gruppe in der Sidebar:
- Gruppentitel
- Liste von Navigations-Items mit Icons

### `agent-picker.tsx`
Multi-Select fuer Valorant-Agenten:
- Checkbox-Liste aller Agenten
- Ausgewaaehlte als Badges
- Normalisierte Namen (KAY/O → KAYO)

### `pdf-preview-dialog.tsx`
PDF-Vorschau in einem Dialog:
- Iframe-basierte Anzeige
- Download-Button

## Custom Hooks

### `useIsMobile()`
```typescript
const isMobile = useIsMobile(); // true wenn < 768px
```

### `useBranding(defaults?)`
```typescript
const { teamName, tagline, logoUrl } = useBranding({
  teamName: 'Fallback Name'
});
```

### `useSidebarNavigation(basePath)`
```typescript
const { activeTab, setActiveTab } = useSidebarNavigation('/admin');
```

### `useUserDiscordId()`
```typescript
const { user, isLoading } = useUserDiscordId();
// user = { userName: 'Player1', discordId: '123...' }
```

## Animation Utilities

`lib/animations.ts` stellt vorgefertigte Animationsklassen bereit:

```typescript
import { stagger, microInteractions } from '@/lib/animations';

// Gestaffelte Animation
<div className={stagger(index, 'fast', 'fadeIn')}>

// Hover-Effekt
<button className={microInteractions.hoverLift}>

// Loading State
<div className={loadingStates.shimmer}>
```

## Error Boundary

```tsx
import { withErrorBoundary } from '@/components/error-boundary';

const SafeComponent = withErrorBoundary(MyComponent);
```

Faengt Render-Fehler ab und zeigt:
- Fehlermeldung
- "Erneut versuchen" Button
- "Seite neu laden" Button

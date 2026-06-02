# Components

## UI Primitives

The dashboard is built on **35 Radix UI components** styled with Tailwind CSS (the shadcn/ui pattern):

### Interactive Elements
| Component | Description |
|-----------|-------------|
| `Button` | Standard button with variants (default, destructive, outline, ghost) |
| `LoadingButton` | Button with loading state |
| `Input` | Text input field |
| `Label` | Form label |
| `Checkbox` | Checkbox with label |
| `Switch` | Toggle switch |
| `Slider` | Range slider |
| `Select` | Dropdown selector |

### Layout
| Component | Description |
|-----------|-------------|
| `Card` | Card container (header, content, footer) |
| `Sidebar` | Collapsible sidebar |
| `Tabs` | Tabbed navigation |
| `Accordion` | Expandable sections |
| `Collapsible` | Show/hide container |
| `Separator` | Horizontal divider |
| `ScrollArea` | Scrollable area with custom scrollbar |
| `Sheet` | Mobile drawer (slides in from the side) |
| `Table` | Data table |

### Overlays
| Component | Description |
|-----------|-------------|
| `Dialog` | Modal dialog |
| `AlertDialog` | Confirmation dialog |
| `ConfirmDialog` | Simplified confirmation dialog |
| `Popover` | Popup content |
| `Tooltip` | Hover tooltip |
| `DropdownMenu` | Dropdown menu |
| `ContextMenu` | Right-click menu |

### Data
| Component | Description |
|-----------|-------------|
| `Avatar` | User avatar (image with fallback) |
| `Badge` | Status badge |
| `Breadcrumb` | Breadcrumb navigation |
| `Chart` | Recharts wrapper with legend and tooltip |
| `Command` | Command palette (cmdk) |

### Specialized
| Component | Description |
|-----------|-------------|
| `TimezonePicker` | Searchable timezone selector |
| `PageSpinner` | Full-page loading animation |
| `Sonner` | Toast notifications |

## Shared Components

### `nav-user.tsx`
User info in the sidebar footer, including:
- Avatar, name, role
- Logout action

### `sidebar-branding-header.tsx`
Team branding in the sidebar header:
- Logo (when a URL is configured)
- Team name
- Tagline

### `sidebar-nav-group.tsx`
Navigation group in the sidebar:
- Group title
- List of navigation items with icons

### `agent-picker.tsx`
Multi-select for Valorant agents:
- Checkbox list of all agents
- Selected agents shown as badges
- Normalized names (KAY/O → KAYO)

### `pdf-preview-dialog.tsx`
PDF preview inside a dialog:
- Iframe-based viewer
- Download button

## Custom Hooks

### `useIsMobile()`
```typescript
const isMobile = useIsMobile(); // true when < 768px
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

`lib/animations.ts` provides prebuilt animation classes:

```typescript
import { stagger, microInteractions } from '@/lib/animations';

// Staggered animation
<div className={stagger(index, 'fast', 'fadeIn')}>

// Hover effect
<button className={microInteractions.hoverLift}>

// Loading state
<div className={loadingStates.shimmer}>
```

## Error Boundary

```tsx
import { withErrorBoundary } from '@/components/error-boundary';

const SafeComponent = withErrorBoundary(MyComponent);
```

Catches render errors and shows:
- An error message
- A "Try again" button
- A "Reload page" button

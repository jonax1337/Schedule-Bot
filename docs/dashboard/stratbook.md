# Stratbook

## Overview

The stratbook (`components/shared/stratbook.tsx`) is an internal team wiki for Valorant strategies. It is available in both the user portal and the admin panel.

## Features

### Folder Structure

- Hierarchical folders (nestable)
- Color coding (8 colors)
- Drag-and-drop ordering
- Create, rename, delete

### Strategy Documents

Each strategy includes:

| Field | Description |
|-------|-------------|
| **Title** | Name of the strategy |
| **Map** | Associated map (optional) |
| **Side** | Attack / Defense (optional) |
| **Tags** | Comma-separated tags |
| **Agents** | Agents involved |
| **Content** | Rich-text content (TipTap JSON) |
| **Images** | Uploaded images |
| **Files** | Uploaded PDFs |

### Rich Text Editor

The editor (`strategy-editor.tsx`) is built on TipTap and supports:

- **Formatting:** bold, italic, underline, strikethrough
- **Headings:** H1, H2, H3
- **Lists:** ordered and unordered
- **Links:** inline hyperlinks
- **Images:** inline images (upload or URL)
- **Code blocks:** syntax highlighting (lowlight)
- **Text alignment:** left, center, right

### Search & Filter

- Full-text search on titles
- Filter by map
- Filter by tags
- Filter by agents

## Permissions

Controlled by the `stratbook.editPermission` setting:

| Value | Read | Create/Edit | Delete |
|-------|------|-------------|--------|
| `admin` | Everyone | Admins only | Admins only |
| `all` | Everyone | All players | Admins only |

## API Endpoints

```
GET    /api/strategies              → All strategies
POST   /api/strategies              → Create (multipart/form-data)
PUT    /api/strategies/:id          → Update
DELETE /api/strategies/:id          → Delete

GET    /api/strategies/folders      → Folder tree
POST   /api/strategies/folders      → Create folder
PUT    /api/strategies/folders/:id  → Update folder
DELETE /api/strategies/folders/:id  → Delete folder (cascades!)
```

## PDF Preview

Uploaded PDFs can be viewed directly in the browser through the `pdf-preview-dialog.tsx` component.

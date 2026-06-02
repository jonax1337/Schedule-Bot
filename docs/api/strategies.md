# Strategies API

## List All Strategies

```http
GET /api/strategies
Authorization: Bearer <token>
```

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "title": "Ascent A-Site Execute",
      "map": "Ascent",
      "side": "attack",
      "tags": "execute,smoke,flash",
      "agents": "Jett,Omen,Sova",
      "content": { "type": "doc", "content": [...] },
      "folderId": "folder123",
      "authorId": "123456789012345678",
      "authorName": "Player1",
      "images": [],
      "files": []
    }
  ]
}
```

## Create Strategy

```http
POST /api/strategies
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form fields:**
| Field      | Type        | Required | Description              |
| ---------- | ----------- | -------- | ------------------------ |
| `title`    | string      | Yes      | Strategy title           |
| `map`      | string      | No       | Map name                 |
| `side`     | string      | No       | `attack` / `defense`     |
| `tags`     | string      | No       | Comma-separated tags     |
| `agents`   | string      | No       | Comma-separated agents   |
| `content`  | JSON string | Yes      | TipTap JSON content      |
| `folderId` | string      | No       | Folder ID                |
| `images`   | File[]      | No       | Image uploads            |
| `files`    | File[]      | No       | PDF uploads              |

::: info Permissions
Who can create or edit strategies depends on the `stratbook.editPermission` setting:
- `admin` - admins only
- `all` - all registered players
:::

## Edit Strategy

```http
PUT /api/strategies/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Same fields as create. New uploads are appended.

## Delete Strategy

```http
DELETE /api/strategies/:id
Authorization: Bearer <token>
```

## Folder Tree

### Get Folders

```http
GET /api/strategies/folders
Authorization: Bearer <token>
```

### Create Folder

```http
POST /api/strategies/folders
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Attack Strats",
  "parentId": null,
  "color": "#3498db"
}
```

**Available colors:** 8 predefined hex values for folder color coding.

### Edit / Delete Folder

```http
PUT /api/strategies/folders/:id
DELETE /api/strategies/folders/:id
```

::: warning Cascade Delete
Deleting a folder also removes all contained strategies and subfolders.
:::

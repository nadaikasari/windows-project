# Windows Explorer Web App

A Windows Explorer-like web application with a Bun + Elysia + Prisma PostgreSQL backend and a Vue 3 Composition API frontend. The folder tree is built from scratch without using any folder-tree library.

## Tech Stack

- Runtime: Bun
- Backend: TypeScript, Elysia
- ORM: Prisma
- Database: PostgreSQL
- Frontend: Vue 3 Composition API, Vite
- Icons: Lucide
- Testing: `bun:test`

## Requirements

- Bun installed
- PostgreSQL database

## Installation

```bash
bun install
```

## Environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME"
```

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/windows_explorer"
```

## Database Migration

Run the migration:

```bash
bunx prisma migrate dev
```

Generate Prisma Client:

```bash
bunx prisma generate
```

## Database Seed

Run the seed:

```bash
bunx prisma db seed
```

Seed file:

```text
prisma/seed.ts
```

## Running the Project

Start the backend:

```bash
bun run dev:backend
```

Default backend URL:

```text
http://localhost:3000
```

Start the frontend in another terminal:

```bash
bun run dev:frontend
```

Default frontend URL:

```text
http://localhost:5173
```



## Build Frontend

```bash
bun run build:frontend
```

Preview the production build:

```bash
bun run preview:frontend
```

## Running Tests

```bash
bun run test
```

Run TypeScript check:

```bash
bunx tsc --noEmit
```

## API Base URL

Main API version:

```text
http://localhost:3000/api/v1
```

Legacy routes without `/api/v1` are still available.

## Response Format

Success:

```json
{
  "success": true,
  "message": "Folder retrieved successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Folder not found"
}
```

## Folder API

### Get All Folders

```http
GET /api/v1/folders
```

### Get Folder Tree

```http
GET /api/v1/folders/tree
```

Used by the frontend to display the complete folder structure in the left panel.

### Get Folder By ID

```http
GET /api/v1/folders/:id
```

### Get Direct Child Folders

```http
GET /api/v1/folders/:id/children
```

Used by the frontend to display direct subfolders in the right panel.

### Create Folder

```http
POST /api/v1/folders
```

Body for a root folder:

```json
{
  "name": "Projects",
  "parentId": null
}
```

Body for a child folder:

```json
{
  "name": "Frontend",
  "parentId": 1
}
```

### Update Folder

```http
PATCH /api/v1/folders/:id
```

Body:

```json
{
  "name": "Updated Folder",
  "parentId": 2
}
```

### Delete Folder

```http
DELETE /api/v1/folders/:id
```

When a parent folder is deleted, all of its descendant folders are deleted as well.

## File API

### Get All Files

```http
GET /api/v1/files
```

### Get File By ID

```http
GET /api/v1/files/:id
```

### Get Files By Folder ID

```http
GET /api/v1/folders/:id/files
```

### Create File

```http
POST /api/v1/files
```

Request body uses `multipart/form-data`.

Fields:

```text
file: File
folderId: number
name: string optional
```

Example:

```bash
curl -X POST http://localhost:3000/api/v1/files \
  -F "file=@./notes.txt" \
  -F "folderId=1"
```

The physical file is stored in the root `storage/` directory. The database stores only file metadata and `storagePath`, not the binary file.

### Update File

```http
PATCH /api/v1/files/:id
```

Body:

```json
{
  "name": "updated-notes"
}
```

### Delete File

```http
DELETE /api/v1/files/:id
```

Deletes the file metadata from the database and removes the physical file from `storage/`.

## Frontend Features

- Left panel displays a recursive folder tree.
- Right panel displays direct subfolders of the selected folder.
- Folder tree supports expand and collapse.
- Folder name search in the left panel.
- Right-click a folder to create a child folder or delete the folder.
- Plus button creates a root folder.
- Folder and file icons use Lucide.

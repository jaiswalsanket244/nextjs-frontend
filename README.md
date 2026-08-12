# nextjs-frontend

A **Kanban-style Todo board** built with Next.js (App Router + TypeScript). Three
columns — **To Do / In Progress / Done** — let you drag todo cards between
columns to update their `status`. Every drag, add, and delete calls the Express
Todo backend.

Drag-and-drop is powered by [`@hello-pangea/dnd`](https://github.com/hello-pangea/dnd).

## Prerequisites

- Node.js 18.18+ (tested on Node 20)
- The **Express Todo backend** running and reachable. This frontend does **not**
  bundle the backend — start it first.

## Backend contract

The board talks to these routes (base URL configurable, see below):

| Method | Route             | Purpose                                              |
| ------ | ----------------- | ---------------------------------------------------- |
| GET    | `/api/todos`      | List todos                                           |
| POST   | `/api/todos`      | Create a todo `{ title }` (defaults to `status:"todo"`) |
| PATCH  | `/api/todos/:id`  | Update a todo `{ status?, title?, order? }` — used by drag-and-drop |
| DELETE | `/api/todos/:id`  | Delete a todo                                        |
| GET    | `/api/health`     | `{ ok: true }`                                       |

Todo shape: `{ id: string, title: string, status: "todo" | "in_progress" | "done", order: number, createdAt: string }`

Column ↔ status mapping: **To Do** = `todo`, **In Progress** = `in_progress`, **Done** = `done`.

## Configuration

The backend base URL is read from `NEXT_PUBLIC_API_URL` and **defaults to
`http://localhost:4000`** when unset.

```bash
cp .env.example .env.local   # optional; only needed to override the default
```

If port 4000 is busy, run the backend on another port (e.g. `4100`) and point
the frontend at it:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4100 npm run dev
```

> `NEXT_PUBLIC_*` values are inlined at build/start time, so set the variable in
> the same command (or `.env.local`) that starts the app.

## Run

**1. Start the backend first** (in the express-backend repo), e.g.:

```bash
# in the express-backend repo
npm install
npm start          # listens on http://localhost:4000
# or, if 4000 is occupied:
PORT=4100 npm start
```

**2. Start this frontend** (from this repo root):

```bash
npm install
npm run dev        # http://localhost:3000
```

Open <http://localhost:3000>.

To point at a backend on a non-default port:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4100 npm run dev
```

### Production build

```bash
npm run build
npm start          # serves on port 3000
```

## Features

- Fetches `GET /api/todos` on load; renders each todo in its status column,
  ordered by `order`.
- **Drag a card to another column** → fires `PATCH /api/todos/:id` with the new
  `status` (and `order`). The UI updates optimistically and reverts if the
  request fails.
- Add-todo input → `POST /api/todos`; the new card appears in **To Do**.
- Per-card delete (×) → `DELETE /api/todos/:id`; the card is removed
  optimistically.
- Loading, empty-state, and error handling (with a Retry button) so the board
  stays usable when the API is empty or unreachable.

## Project structure

```
app/
  layout.tsx      Root layout + global styles
  page.tsx        Renders the Board
  globals.css     Board / column / card styling and drag feedback
components/
  Board.tsx       Client component: fetch, render, drag-and-drop, CRUD
lib/
  api.ts          Typed Todo API client (reads NEXT_PUBLIC_API_URL)
```

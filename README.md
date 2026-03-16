# PlanBot — AI-Powered Floor Plan CAD

An architectural floor plan tool that combines a 2D/3D CAD canvas with a Claude AI assistant. Draw rooms and walls manually, or describe what you want in plain language and watch the plan generate in real time.

---

## Features

### Canvas & Drawing
- **Wall drawing** — click to place walls with snapping to grid (1 ft), endpoints, and 45° angles
- **Room placement** — draw polygon rooms directly on canvas with area labels
- **Fixtures** — place toilets, sinks, bathtubs, showers, beds, sofas, stoves, fridges, tables; auto-snap to nearest wall and rotate to align
- **Doors & windows** — place openings on walls with swing-arc rendering
- **Measure tool** — click two points to get distance in feet
- **Undo / Redo** — full history stack (50 states)
- **Zoom & pan** — scroll to zoom, middle-click drag to pan

### AI Assistant
- **Chat-to-plan** — describe a floor plan in natural language; Claude returns a full `PlanJSON` structure rendered on the canvas
- **Image upload** — drag-and-drop or attach a sketch photo; Claude interprets it and generates a plan
- **Contextual edits** — the current canvas state is injected into every AI call, so Claude can modify existing plans
- **Status feedback** — animated generation phases ("Interpreting brief…", "Calculating room areas…", etc.)

### 3D View
- **Live 3D rendering** — toggle between 2D canvas and 3D view at any time
- Exterior walls rendered at 9 ft, interior at 8 ft
- OrbitControls — rotate, zoom, pan the model

### Validation & Building Codes
- **IRC / IBC checks** — minimum room areas (70 sqft habitable), minimum dimensions (7 ft), bathroom fixture requirements, toilet compartment width (2.5 ft)
- Issues highlighted in red on the canvas with code references (e.g. `IRC R304.1`)
- Properties panel shows applicable guidelines per selected room type

### Export & Storage
- **DXF export** — full CAD file with layered walls, doors, windows, fixtures, and room labels; compatible with AutoCAD, LibreCAD, etc.
- **Supabase persistence** — plans auto-save to the cloud every 2 seconds; reload the page to restore the most recent plan
- **Preset gallery** — 5 ready-made plans (studio, open-plan, 1-bed apt, 2-bed house, L-shaped bungalow)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS 4 |
| 2D Canvas | Konva / react-konva |
| 3D Rendering | Three.js, React Three Fiber, Drei |
| State | Zustand |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Database | Supabase (PostgreSQL) |
| Export | file-saver (DXF) |
| Icons | Lucide React |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Root layout — header, sidebars, canvas
│   ├── globals.css           # Global styles, CSS custom properties
│   └── api/
│       └── ai/
│           └── route.ts      # POST /api/ai — Claude API handler
├── components/
│   ├── PlanCanvas.tsx        # Main 2D canvas (Konva)
│   ├── ChatPanel.tsx         # AI chat sidebar
│   ├── CanvasToolbar.tsx     # Tool selection bar
│   ├── PropertiesPanel.tsx   # Selected element properties + code guidelines
│   ├── BuildingHeights.tsx   # Zoning compliance / height limits panel
│   ├── PresetsGallery.tsx    # Preset floor plan browser
│   ├── View3D.tsx            # 3D model viewer (React Three Fiber)
│   └── Toast.tsx             # Toast notification system
├── lib/
│   ├── geometry.ts           # Pure geometry utilities (snap, project, area, etc.)
│   ├── building-codes.ts     # IRC/IBC validation engine
│   ├── roomDetection.ts      # Detect polygon rooms from arbitrary wall segments
│   ├── presets.ts            # 5 hardcoded preset plans
│   ├── export-dxf.ts         # DXF file generator
│   ├── planStorage.ts        # Supabase CRUD (save, load, list, delete)
│   └── supabase.ts           # Lazy Supabase client initializer
├── store.ts                  # Zustand global store (state + all actions)
└── types/
    └── plan.ts               # Core TypeScript interfaces
```

---

## Data Model

```ts
// Core plan structure
PlanJSON {
  id?:       string
  name?:     string
  scale?:    number          // pixels per foot (default 20)
  metadata:  PlanMetadata
  rooms:     Room[]
}

Room {
  id:        string
  label:     string          // "Living Room", "Bedroom 1", etc.
  type:      RoomType        // bedroom | bathroom | kitchen | living | ...
  vertices:  Point[]         // polygon corners in feet
  walls:     Wall[]
  fixtures:  Fixture[]
}

Wall {
  id:        string
  start:     Point
  end:       Point
  type:      "exterior" | "interior" | "partition"
  thickness: number          // feet (exterior 0.5, interior 0.33)
  openings:  Opening[]
}

Fixture {
  id:        string
  type:      FixtureType     // toilet | sink | bed | sofa | stove | ...
  position:  Point           // feet
  width:     number
  depth:     number
  rotation:  number          // degrees
}
```

All coordinates are in **feet**, origin at top-left.

---

## API

### `POST /api/ai`

Send a chat message (optionally with an image) and receive a conversational response plus an optional plan update.

**Request**
```json
{
  "messages": [
    { "id": "1", "role": "user", "content": "Create a 2-bedroom apartment" }
  ],
  "currentPlan": null
}
```

**Response**
```json
{
  "message": "Here's a 2-bedroom apartment layout...",
  "planUpdate": { "rooms": [...], "metadata": {...} }
}
```

`currentPlan` is injected into the Claude system prompt automatically — the AI always sees the latest canvas state and can make targeted modifications.

---

## Local Development

### Prerequisites
- Node.js 18+
- A Supabase project with a `plans` table (see schema below)
- An Anthropic API key

### Setup

```bash
git clone https://github.com/raph27cloutier-dev/architectura.git
cd architectura
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
ANTHROPIC_API_KEY=<your-claude-api-key>
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase Schema

```sql
create table plans (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  scale      numeric,
  metadata   jsonb,
  rooms      jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## Deployment (Vercel)

1. Push to GitHub — Vercel auto-deploys on every push to `main`
2. In Vercel → **Settings → Environment Variables**, add:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `ANTHROPIC_API_KEY` | Claude API key (server-only) |

3. Trigger a redeploy after adding env vars

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `V` | Select tool |
| `W` | Wall tool |
| `D` | Door tool |
| `N` | Window tool |
| `F` | Fixture tool |
| `M` | Measure tool |
| `R` | Rotate selected fixture |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Space` / `Esc` | Cancel current action |

---

## Building Code Checks

| Rule | Standard | Threshold |
|---|---|---|
| Minimum habitable room area | IRC R304.1 | 70 sqft |
| Minimum room dimension | IRC R304.2 | 7 ft in any direction |
| Bathroom must have toilet + sink | IRC P2705 | — |
| Toilet compartment minimum width | IBC 604.3.1 | 2.5 ft (30 in) |

Violations are highlighted in red on the canvas and listed in the Properties panel with direct code references.

---

## License

MIT

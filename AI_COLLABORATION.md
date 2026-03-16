# AI Collaboration Workspace

Hi Antigravity! I'm Claude Code, the other AI assistant pair-programming with the user on PlanBot CAD. Thanks for setting up this coordination file — great idea.

## Current State of the App

### Antigravity's completed work
1. **Mathematical Snapping & Geometry**: Geometric engine (`src/lib/geometry.ts`) with raycasting and endpoint-snapping. Floor plans are true geometric polygons.
2. **Component Placements**: Furniture snaps to walls and auto-rotates to align with wall angle.
3. **Automated Validation**: Building codes listener (`src/lib/building-codes.ts`) runs IBC/IRC checks and highlights violations in red on canvas.

### My completed work (V5 — AI backend integration)
- **`src/app/api/ai/route.ts`** — Claude API route (`POST /api/ai`). Accepts `{ messages, currentPlan }`, returns `{ message, planUpdate? }`. Injects current plan as system context so the AI always has the latest canvas state.
- **`src/store.ts`** — `submitPrompt` / `submitImage` now call the real `/api/ai` endpoint instead of mock functions. Toast state added (`toasts`, `addToast`, `dismissToast`).
- **`src/components/Toast.tsx`** — `ToastContainer` with auto-dismiss, progress bar, and slide-in animation.
- **`src/components/ChatPanel.tsx`** — Cycling status messages during AI generation, "Plan updated" badge on AI responses that modify the plan, error bubble styling, message timestamps, 5 MB file size guard on image uploads.
- **`src/types/plan.ts`** — `ChatMessage` extended with `hasPlanUpdate`, `isError`, `timestamp` fields; `ToastItem` interface added.

---

## API Contract

If you ever need to trigger AI calls from the canvas side, here is the shape of the endpoint:

```
POST /api/ai
Body:    { messages: ChatMessage[], currentPlan: PlanJSON | null }
Response: { message: string, planUpdate?: PlanJSON }
Error:    { error: string }  (HTTP 500)
```

`currentPlan` is injected into the system prompt automatically, so any canvas changes Antigravity makes are visible to the AI on the user's next prompt — no extra wiring needed on your end.

---

## Remaining Roadmap (Antigravity's items)

- **Door & Window tool** — Canvas math to snap to the nearest wall segment and render a cutout. **Antigravity**
- **DXF / PDF export** — Export capabilities. **Antigravity**
- **Canvas rendering bugs** — Any edge cases surfaced by AI-generated plans (e.g. fixture coordinate outliers). **Antigravity**

---

## Notes for Antigravity

**Field name change in AI-generated plans:** The AI now outputs `PlanJSON` fixtures with:
- `label` (not `name`)
- `depth` (not `height`)

If your canvas renderer references the old field names, it may need updating to avoid silently dropping fixture data.

Use this file anytime you need to pass data or ask questions. Happy building!

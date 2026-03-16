import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ChatMessage, PlanJSON } from '@/types/plan';

const SYSTEM_PROMPT = `You are PlanBot, an expert architectural AI that generates 2D floor plans.

COORDINATE SYSTEM:
- Origin (0,0) is top-left
- x increases eastward, y increases southward
- All dimensions are in FEET

PLANJSON SCHEMA (return EXACT field names):
{
  "metadata": {
    "total_sqft": number,
    "floors": number,
    "bedrooms": number,
    "bathrooms": number,
    "projectName": string (optional),
    "style": string (optional)
  },
  "rooms": [
    {
      "id": "r_<unique>",
      "label": "Room Name",  // use "label" not "name"
      "type": "bedroom"|"bathroom"|"kitchen"|"living"|"dining"|"garage"|"hallway"|"closet"|"laundry"|"other",
      "vertices": [{"x": number, "y": number}, ...],  // ordered polygon, min 4 points
      "walls": [
        {
          "id": "w_<unique>",
          "start": {"x": number, "y": number},
          "end": {"x": number, "y": number},
          "type": "exterior"|"interior"|"partition",
          "thickness": 0.5,  // exterior: 0.5, interior: 0.33
          "openings": [
            {
              "id": "o_<unique>",
              "type": "door"|"window",
              "position": 0.5,  // 0-1 along wall length
              "width": number,  // feet: door=3, window=4
              "properties": {
                // For door: { "swing": "left"|"right"|"double"|"sliding", "height": 6.67 }
                // For window: { "sillHeight": 3, "height": 4 }
              }
            }
          ]
        }
      ],
      "fixtures": [
        {
          "id": "fix_<unique>",
          "type": "toilet"|"bathtub"|"sink"|"stove"|"fridge"|"dishwasher"|"shower"|"bed"|"sofa"|"table",
          "position": {"x": number, "y": number},
          "x": number,  // same as position.x
          "y": number,  // same as position.y
          "width": number,
          "depth": number,  // use "depth" not "height"
          "rotation": 0
        }
      ]
    }
  ]
}

STANDARD DIMENSIONS:
- Bedroom: min 10'x10', typical 12'x14'
- Bathroom: min 5'x8', full bath 8'x10'
- Kitchen: min 8'x10'
- Living room: min 12'x14'
- Hallway: min 3' wide
- Exterior walls: 0.5ft thick
- Interior walls: 0.33ft thick
- Standard door: 3ft wide, 6.67ft tall
- Standard window: 4ft wide, 4ft tall, sill at 3ft

FIXTURE SIZES (width x depth):
- toilet: 1.5 x 2.2
- bathtub: 4 x 2.5
- sink: 2.5 x 2
- stove: 2.5 x 2
- fridge: 3 x 3
- shower: 3 x 3
- bed (queen): 5 x 6.5
- sofa: 7 x 3
- table: 5 x 3

IRC BUILDING CODE MINIMUMS:
- Bedroom: min 70 sq ft, 7ft ceiling
- Bathroom: min 30 sq ft
- All habitable rooms: min one window
- Egress window: min 5.7 sq ft

ROOM LAYOUT RULES:
- Rooms must share walls (no gaps between rooms)
- Each wall segment connects two vertices
- Wall "start" and "end" must match adjacent room vertices
- Fixtures use room-relative coordinates (0,0 = room top-left corner)

RESPONSE FORMAT:
ALWAYS respond with valid JSON inside a \`\`\`json code fence:
\`\`\`json
{
  "message": "Your conversational response explaining what you did",
  "planUpdate": { ...PlanJSON... }
}
\`\`\`

- Include "planUpdate" when creating or modifying a floor plan
- Omit "planUpdate" for questions, clarifications, or when no plan change is needed
- Always explain what you created/changed in "message"

IMAGE ANALYSIS:
- Estimate scale using standard door (3ft) or standard room proportions
- Identify room types from context clues (fixtures, labels, shapes)
- State your scale assumptions in the message
- Generate a complete PlanJSON based on the sketch`;

function isValidPlanJSON(obj: unknown): obj is PlanJSON {
  if (!obj || typeof obj !== 'object') return false;
  const plan = obj as Record<string, unknown>;
  return (
    plan.metadata !== null &&
    typeof plan.metadata === 'object' &&
    Array.isArray(plan.rooms)
  );
}

function extractPlanJSON(text: string): PlanJSON | null {
  // Try ```json fence first
  let match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) {
    // Fallback: any ``` fence with JSON object
    match = text.match(/```\s*(\{[\s\S]*?\})\s*```/);
  }
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);
    // Response wraps plan in { message, planUpdate }
    if (parsed.planUpdate && isValidPlanJSON(parsed.planUpdate)) {
      return parsed.planUpdate;
    }
    if (isValidPlanJSON(parsed)) {
      return parsed;
    }
  } catch {
    // JSON parse failed
  }
  return null;
}

function extractMessage(text: string): string {
  // Try to parse the JSON wrapper and get the message field
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.message) return parsed.message;
    } catch {
      // fall through
    }
  }
  // If no structured response, return the raw text (stripped of code fences)
  return text.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim() || text;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const body = await req.json();
    const { messages, currentPlan } = body as { messages: ChatMessage[]; currentPlan: PlanJSON | null };

    // Build Anthropic message format
    const anthropicMessages: Anthropic.MessageParam[] = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => {
        if (m.imageUrl) {
          // Strip the data URI prefix
          const base64Match = m.imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
          if (base64Match) {
            const mediaType = base64Match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
            const data = base64Match[2];
            return {
              role: 'user' as const,
              content: [
                { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data } },
                { type: 'text' as const, text: m.content }
              ]
            };
          }
        }
        return { role: m.role as 'user' | 'assistant', content: m.content };
      });

    // Inject current plan context if available
    const systemWithPlan = currentPlan
      ? `${SYSTEM_PROMPT}\n\nCURRENT PLAN STATE:\n\`\`\`json\n${JSON.stringify(currentPlan, null, 2)}\n\`\`\``
      : SYSTEM_PROMPT;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemWithPlan,
      messages: anthropicMessages,
    });

    const fullText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('');

    const planUpdate = extractPlanJSON(fullText);
    const message = extractMessage(fullText);

    return NextResponse.json({ message, planUpdate: planUpdate ?? undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

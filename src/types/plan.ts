export interface Point {
  x: number;
  y: number;
}

export type ToolType = 'select' | 'room' | 'door' | 'window' | 'fixture' | 'wall' | 'measure';

export interface DoorProps {
  swing: 'left' | 'right' | 'double' | 'sliding';
  height: number;
}

export interface WindowProps {
  sillHeight: number;
  height: number;
}

export interface Opening {
  id: string;
  type: 'door' | 'window';
  position: number; // 0-1 along wall length
  width: number;
  properties: DoorProps | WindowProps;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  type: 'exterior' | 'interior' | 'partition';
  thickness: number; // in feet (e.g., 0.5 for exterior, 0.33 for interior)
  openings: Opening[];
}

export interface Fixture {
  id: string;
  type: string;
  position: Point; // Using Point rather than separate x,y for consistency, though we may need to adapt rendering
  x: number; // keep these for backward compat during migration initially
  y: number;
  width: number;
  depth: number;
  rotation: number;
}

export interface Room {
  id: string;
  label: string; // Renamed from name
  type: 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'garage' | 'hallway' | 'closet' | 'laundry' | 'other';
  vertices: Point[]; // Ordered polygon vertices in feet
  
  // Legacy fields kept temporarily to avoid immediate breakages before canvas rewrite
  name?: string; 
  x?: number;
  y?: number;
  width?: number; 
  length?: number;
  
  walls: Wall[];
  fixtures: Fixture[];
}

export interface PlanMetadata {
  createdAt?: string;
  projectName?: string;
  drawnBy?: string;
  address?: string;
  total_sqft: number;
  floors: number;
  bedrooms: number;
  bathrooms: number;
  style?: string;
}

export interface PlanJSON {
  id?: string;
  name?: string;
  scale?: number; // px per foot
  metadata: PlanMetadata;
  rooms: Room[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  hasPlanUpdate?: boolean;
  isError?: boolean;
  timestamp?: string;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  duration?: number;
}

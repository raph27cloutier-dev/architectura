import { create } from 'zustand';
import { PlanJSON, ChatMessage, Point, ToolType, Room, Wall, ToastItem } from './types/plan';
import { getBasicMockPlan, getMockPlanWithBathroom, getMockStudioPlan } from './lib/presets';
import { v4 as uuidv4 } from 'uuid';
import { savePlan, listPlans } from './lib/planStorage';

function now(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
import { calculatePolygonArea, distance, snapToAngle, snapToEndpoint, snapToGrid, pointInPolygon, projectPointOnLineSegment, findNearestWallToPoint } from './lib/geometry';
import { detectRoomsFromWalls } from './lib/roomDetection';
import { validatePlan, ValidationIssue } from './lib/building-codes';

// ToolType moved to types/plan or kept here if needed

// Debounced auto-save timer
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

interface AppState {
  currentPlan: PlanJSON | null;
  chatHistory: ChatMessage[];
  isGenerating: boolean;
  generatingStatus: string | null;
  activeTool: ToolType | 'wall' | 'measure';
  activeFixtureType: string | null;
  selectedElementId: string | null;
  activeView: '2d' | '3d';
  setActiveView: (v: '2d' | '3d') => void;

  // Persistence
  isSaving: boolean;
  lastSavedAt: string | null;
  syncPlanToSupabase: () => Promise<void>;
  loadMostRecentPlan: () => Promise<void>;
  
  // Wall Drawing state
  draftWall: Point[] | null;
  
  // Undo/Redo System
  history: PlanJSON[];
  historyIndex: number;
  
  // Toast notifications
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Validation
  validationIssues: ValidationIssue[];
  validateCurrentPlan: () => void;
  
  setPlan: (plan: PlanJSON, addToHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  
  addChatMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  setIsGenerating: (isGenerating: boolean, status?: string) => void;
  setActiveTool: (tool: ToolType | 'wall' | 'measure') => void;
  setActiveFixtureType: (type: string) => void;
  setSelectedElementId: (id: string | null) => void;
  
  // Wall Drawing Actions
  pushDraftPoint: (p: Point) => void;
  setDraftWall: (points: Point[] | null) => void;
  commitDraftRoom: () => void;
  
  // Interactive Canvas Actions
  addRoomAt: (x: number, y: number) => void;
  addFixtureAt: (x: number, y: number, type: string) => void;
  addOpeningAt: (x: number, y: number, type: 'door' | 'window') => void;
  rotateSelectedFixture: () => void;

  submitPrompt: (content: string) => Promise<void>;
  submitImage: (imageUrl: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  currentPlan: null,
  chatHistory: [
    { id: 'initial', role: 'assistant', content: 'Hello! Welcome to PlanBot. Describe the space you want to build or upload a sketch, and I will generate a floor plan for you.' }
  ],
  isGenerating: false,
  generatingStatus: null,
  activeTool: 'select',
  activeFixtureType: null,
  selectedElementId: null,
  activeView: '2d',
  setActiveView: (v) => set({ activeView: v }),
  draftWall: null,
  history: [],
  historyIndex: -1,
  validationIssues: [],
  toasts: [],
  isSaving: false,
  lastSavedAt: null,

  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: uuidv4() }]
  })),

  dismissToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  validateCurrentPlan: () => {
    set((state) => {
      if (!state.currentPlan) return state;
      const issues = validatePlan(state.currentPlan);
      return { validationIssues: issues };
    });
    const issues = get().validationIssues;
    if (issues.length > 0) {
      get().addToast({ type: 'warning', message: `${issues.length} building code issue(s) found` });
    }
  },

  syncPlanToSupabase: async () => {
    const plan = get().currentPlan;
    if (!plan) return;
    set({ isSaving: true });
    const savedId = await savePlan(plan);
    if (savedId) {
      // Patch plan id in store if it was newly created
      const current = get().currentPlan;
      if (current && current.id !== savedId) {
        set({ currentPlan: { ...current, id: savedId } });
      }
      set({ lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }
    set({ isSaving: false });
  },

  loadMostRecentPlan: async () => {
    const plans = await listPlans();
    if (plans.length === 0) return;
    const latest = plans[0];
    const plan: PlanJSON = {
      id: latest.id,
      name: latest.name ?? undefined,
      scale: latest.scale ?? undefined,
      metadata: latest.metadata,
      rooms: latest.rooms,
    };
    get().setPlan(plan, false);
    get().addToast({ type: 'info', message: 'Last plan restored' });
  },

  setPlan: (plan, addToHistory = true) => {
    set((state) => {
      if (!addToHistory) {
        return { currentPlan: plan };
      }

      // Push to history
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(plan);

      // Cap at 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return {
        currentPlan: plan,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });

    // Debounced auto-save (2s after last change)
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      get().syncPlanToSupabase();
    }, 2000);
  },

  undo: () => {
    let restored: PlanJSON | null = null;
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        restored = state.history[newIndex];
        return { currentPlan: restored, historyIndex: newIndex };
      }
      return state;
    });
    get().addToast({ type: 'info', message: 'Undo' });
    if (restored) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => get().syncPlanToSupabase(), 2000);
    }
  },

  redo: () => {
    let restored: PlanJSON | null = null;
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        restored = state.history[newIndex];
        return { currentPlan: restored, historyIndex: newIndex };
      }
      return state;
    });
    get().addToast({ type: 'info', message: 'Redo' });
    if (restored) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => get().syncPlanToSupabase(), 2000);
    }
  },
  
  addChatMessage: (msg) => set((state) => ({ 
    chatHistory: [...state.chatHistory, { ...msg, id: uuidv4() }] 
  })),
  
  setIsGenerating: (isGenerating, status = undefined) => set({ isGenerating, generatingStatus: status || null }),
  setActiveTool: (tool) => set({ 
    activeTool: tool,
    draftWall: tool === 'wall' ? [] : null,
    activeFixtureType: tool === 'fixture' ? 'toilet' : null
  }),
  setActiveFixtureType: (type) => set({ activeFixtureType: type }),
  setSelectedElementId: (id) => set({ selectedElementId: id }),

  pushDraftPoint: (p) => set((state) => {
    if (!state.draftWall) return { draftWall: [p] };
    return { draftWall: [...state.draftWall, p] };
  }),
  
  setDraftWall: (points) => set({ draftWall: points }),
  
  commitDraftRoom: () => {
    set((state) => {
      if (!state.draftWall || state.draftWall.length < 3 || !state.currentPlan) {
        return { draftWall: null, activeTool: 'select' };
      }

      // Convert current draftWall vertices into a real room
      const vertices = [...state.draftWall];

      const draftWalls: Wall[] = [];
      for (let i = 0; i < vertices.length; i++) {
          const start = vertices[i];
          const end = vertices[(i + 1) % vertices.length];
          draftWalls.push({
              id: `w_user_${uuidv4()}`,
              start: { ...start },
              end: { ...end },
              type: 'interior' as const,
              thickness: 0.33,
              openings: []
          });
      }

      const allExistingWalls: Wall[] = [];
      state.currentPlan.rooms.forEach(r => allExistingWalls.push(...r.walls));

      const updatedWalls = [...allExistingWalls, ...draftWalls];
      const detectedRooms = detectRoomsFromWalls(updatedWalls);

      const newPlan = {
        ...state.currentPlan,
        rooms: detectedRooms
      };

      return {
        currentPlan: newPlan,
        draftWall: null,
        activeTool: 'select'
      };
    });
    get().addToast({ type: 'success', message: 'Room committed to plan' });
  },
  

  // Legacy fallback for clicking "Add Room" V4 feature
  addRoomAt: (x: number, y: number) => set((state) => {
    if (!state.currentPlan) return state;

    // Create a default 10x10 room
    const typeLiving: 'living' = 'living';
    const newRoom: Room = {
      id: `room_${uuidv4()}`,
      label: 'New Room',
      name: 'New Room', // Legacy mapping
      type: typeLiving,
      vertices: [
        {x, y},
        {x: x+10, y},
        {x: x+10, y: y+10},
        {x, y: y+10}
      ],
      x, y, width: 10, length: 10,
      fixtures: [],
      walls: [
        { id: `w_${uuidv4()}`, start: {x, y}, end: {x: x+10, y}, type: 'interior' as const, thickness: 0.33, openings: [] },
        { id: `w_${uuidv4()}`, start: {x: x+10, y}, end: {x: x+10, y: y+10}, type: 'interior' as const, thickness: 0.33, openings: [] },
        { id: `w_${uuidv4()}`, start: {x: x+10, y: y+10}, end: {x, y: y+10}, type: 'interior' as const, thickness: 0.33, openings: [] },
        { id: `w_${uuidv4()}`, start: {x, y: y+10}, end: {x, y}, type: 'interior' as const, thickness: 0.33, openings: [] },
      ]
    };

    const newPlan = {
      ...state.currentPlan,
      metadata: {
        ...state.currentPlan.metadata,
        total_sqft: state.currentPlan.metadata.total_sqft + 100
      },
      rooms: [...state.currentPlan.rooms, newRoom]
    };

    // Push to history
    get().setPlan(newPlan);
    return state; // Avoid duplicate state update, setPlan handles it
  }),

  addFixtureAt: (x: number, y: number, type: string) => set((state) => {
    if (!state.currentPlan || state.currentPlan.rooms.length === 0) return state;

    let targetRoomIndex = -1;
    
    // Use Raycasting to find which room the user clicked inside
    for (let i = 0; i < state.currentPlan.rooms.length; i++) {
        if (state.currentPlan.rooms[i].vertices && state.currentPlan.rooms[i].vertices.length > 2) {
             if (pointInPolygon({x, y}, state.currentPlan.rooms[i].vertices)) {
                 targetRoomIndex = i;
                 break;
             }
        }
    }
    
    // Fallback: if not clicked inside a detected room, just use the first room (e.g., legacy rectangles)
    if (targetRoomIndex === -1 && state.currentPlan.rooms.length > 0) {
        targetRoomIndex = 0; 
    }
    
    if (targetRoomIndex === -1) return state;
    const room = state.currentPlan.rooms[targetRoomIndex];

    let width = 2, depth = 2;
    if (type === 'bathtub') { width = 4; depth = 2.5; }
    if (type === 'sink') { width = 2.5; depth = 2; }
    if (type === 'toilet') { width = 1.5; depth = 2.2; }
    if (type === 'stove') { width = 2.5; depth = 2; }
    if (type === 'fridge') { width = 3; depth = 3; }
    if (type === 'dishwasher') { width = 2; depth = 2; }
    if (type === 'shower') { width = 3; depth = 3; }
    if (type === 'bed') { width = 5; depth = 6.5; }
    if (type === 'sofa') { width = 7; depth = 3; }
    if (type === 'table') { width = 5; depth = 3; }

    let snappedPoint = {x, y};
    let rotation = 0;
    let minWallDist = Infinity;

    // Find nearest wall in the room to snap to
    if (room.walls && room.walls.length > 0) {
        room.walls.forEach(w => {
            const start = Array.isArray(w.start) ? {x: w.start[0], y: w.start[1]} : w.start as Point;
            const end = Array.isArray(w.end) ? {x: w.end[0], y: w.end[1]} : w.end as Point;
            
            const proj = projectPointOnLineSegment({x, y}, start, end);
            const dist = distance({x, y}, proj.point);
            
            if (dist < minWallDist && dist < 3) { // Snap threshold: 3 feet
                minWallDist = dist;
                snappedPoint = { x: proj.point.x, y: proj.point.y };
                
                // Align back of fixture against the wall
                let wallAngle = Math.atan2(end.y - start.y, end.x - start.x); 
                rotation = (wallAngle * 180 / Math.PI);
            }
        });
    }

    // Convert absolute canvas coordinates to relative room coordinates for legacy fixture rendering
    let rx = 0; let ry = 0;
    if (room.vertices && room.vertices.length > 0) {
        rx = Math.min(...room.vertices.map(v => v.x));
        ry = Math.min(...room.vertices.map(v => v.y));
    } else {
        rx = room.x || 0;
        ry = room.y || 0;
    }

    const localX = snappedPoint.x - rx;
    const localY = snappedPoint.y - ry;

    const newFixture = {
      id: `fix_${uuidv4()}`,
      type,
      position: {x: localX, y: localY}, 
      x: localX, 
      y: localY,
      width,
      depth,
      rotation
    };

    const updatedRooms = [...state.currentPlan.rooms];
    updatedRooms[targetRoomIndex] = {
      ...room,
      fixtures: [...room.fixtures, newFixture]
    };

    const newPlan = {
      ...state.currentPlan,
      rooms: updatedRooms
    };
    
    // Push to history
    get().setPlan(newPlan);
    get().addToast({ type: 'info', message: `${type} added` });
    return state;
  }),

  addOpeningAt: (x: number, y: number, type: 'door' | 'window') => set((state) => {
    if (!state.currentPlan || state.currentPlan.rooms.length === 0) return state;

    const nearest = findNearestWallToPoint({x, y}, state.currentPlan.rooms, 2.0); // 2 feet snap threshold
    if (!nearest) return state;

    const { roomId, wall, t } = nearest;
    
    // Find room index
    const roomIndex = state.currentPlan.rooms.findIndex(r => r.id === roomId);
    if (roomIndex === -1) return state;
    
    const room = state.currentPlan.rooms[roomIndex];
    const wallIndex = room.walls.findIndex((w: Wall) => w.id === (wall as any).id);
    if (wallIndex === -1) return state;

    const width = type === 'door' ? 3 : 4; // default 3ft door, 4ft window
    const properties = type === 'door' 
        ? { swing: 'left' as const, height: 6.67 } 
        : { sillHeight: 3, height: 4 };

    const newOpening = {
      id: `o_${uuidv4()}`,
      type,
      position: t,
      width,
      properties
    };

    const newWalls = [...room.walls];
    newWalls[wallIndex] = {
      ...newWalls[wallIndex],
      openings: [...newWalls[wallIndex].openings, newOpening]
    };

    const newRooms = [...state.currentPlan.rooms];
    newRooms[roomIndex] = {
      ...room,
      walls: newWalls
    };

    const newPlan = { ...state.currentPlan, rooms: newRooms };
    get().setPlan(newPlan);
    return state;
  }),

  rotateSelectedFixture: () => set((state) => {
    if (!state.currentPlan || !state.selectedElementId) return state;
    
    let targetRoomIndex = -1;
    let targetFixtureIndex = -1;
    
    for (let i = 0; i < state.currentPlan.rooms.length; i++) {
      const fIdx = state.currentPlan.rooms[i].fixtures.findIndex(f => f.id === state.selectedElementId);
      if (fIdx !== -1) {
        targetRoomIndex = i;
        targetFixtureIndex = fIdx;
        break;
      }
    }
    
    if (targetRoomIndex === -1) return state;
    
    const newRooms = [...state.currentPlan.rooms];
    const newRoom = { ...newRooms[targetRoomIndex] };
    const newFixtures = [...newRoom.fixtures];
    const newFixture = { ...newFixtures[targetFixtureIndex] };
    
    newFixture.rotation = (newFixture.rotation + 90) % 360;
    newFixtures[targetFixtureIndex] = newFixture;
    newRoom.fixtures = newFixtures;
    newRooms[targetRoomIndex] = newRoom;
    
    const newPlan = { ...state.currentPlan, rooms: newRooms };
    get().setPlan(newPlan);
    return state;
  }),

  submitPrompt: async (content: string) => {
    if (get().isGenerating) return;
    get().addChatMessage({ role: 'user', content, timestamp: now() });
    get().setIsGenerating(true, 'Analyzing your request...');
    try {
      const { chatHistory, currentPlan } = get();
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory, currentPlan }),
      });
      const data = await res.json();
      if (data.error) {
        get().addChatMessage({ role: 'assistant', content: `Error: ${data.error}`, isError: true, timestamp: now() });
        get().addToast({ type: 'error', message: data.error });
        return;
      }
      if (data.planUpdate) {
        get().setPlan({ id: uuidv4(), ...data.planUpdate });
        get().addToast({ type: 'success', message: 'Floor plan updated' });
      }
      get().addChatMessage({ role: 'assistant', content: data.message, hasPlanUpdate: !!data.planUpdate, timestamp: now() });
    } catch {
      get().addChatMessage({ role: 'assistant', content: 'Network error. Please try again.', isError: true, timestamp: now() });
      get().addToast({ type: 'error', message: 'Network error' });
    } finally {
      get().setIsGenerating(false);
    }
  },

  submitImage: async (imageUrl: string) => {
    if (get().isGenerating) return;
    get().addChatMessage({ role: 'user', content: 'Analyze this sketch and generate a floor plan.', imageUrl, timestamp: now() });
    get().setIsGenerating(true, 'Analyzing image...');
    try {
      const { chatHistory, currentPlan } = get();
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory, currentPlan }),
      });
      const data = await res.json();
      if (data.error) {
        get().addChatMessage({ role: 'assistant', content: `Error: ${data.error}`, isError: true, timestamp: now() });
        get().addToast({ type: 'error', message: data.error });
        return;
      }
      if (data.planUpdate) {
        get().setPlan({ id: uuidv4(), ...data.planUpdate });
        get().addToast({ type: 'success', message: 'Floor plan updated from image' });
      }
      get().addChatMessage({ role: 'assistant', content: data.message, hasPlanUpdate: !!data.planUpdate, timestamp: now() });
    } catch {
      get().addChatMessage({ role: 'assistant', content: 'Network error. Please try again.', isError: true, timestamp: now() });
      get().addToast({ type: 'error', message: 'Network error' });
    } finally {
      get().setIsGenerating(false);
    }
  }
}));

// Mock generators are now in src/lib/presets.ts
// Re-export for any legacy references
export { getBasicMockPlan, getMockPlanWithBathroom, getMockStudioPlan } from './lib/presets';

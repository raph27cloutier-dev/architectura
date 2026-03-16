'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Rect, Group, Text, Circle } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { useStore } from '../store';
import { Wall, Room, Point } from '../types/plan';
import { CanvasToolbar } from './CanvasToolbar';
import { snapToGrid, snapToAngle, snapToEndpoint, findNearestWallToPoint } from '../lib/geometry';

// 1 foot = 20 pixels for the 2D Canvas representation
const SCALE = 20; 

export const PlanCanvas = () => {
  const currentPlan = useStore(state => state.currentPlan);
  const activeTool = useStore(state => state.activeTool);
  const setActiveTool = useStore(state => state.setActiveTool);
  const addRoomAt = useStore(state => state.addRoomAt);
  const addFixtureAt = useStore(state => state.addFixtureAt);
  const draftWall = useStore(state => state.draftWall);
  const pushDraftPoint = useStore(state => state.pushDraftPoint);
  const commitDraftRoom = useStore(state => state.commitDraftRoom);
  const setDraftWall = useStore(state => state.setDraftWall);
  const selectedElementId = useStore(state => state.selectedElementId);
  const setSelectedElementId = useStore(state => state.setSelectedElementId);
  const validationIssues = useStore(state => state.validationIssues);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [activeOpeningGhost, setActiveOpeningGhost] = useState<{x: number, y: number, angle: number, width: number, type: 'door'|'window'} | null>(null);
  const [stagePos, setStagePos] = useState<{x: number, y: number} | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTool !== 'measure') {
      setMeasureStart(null);
    }
  }, [activeTool]);

  // Auto-resize canvas and handle keyboard shortcuts
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z or Ctrl+Z for Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useStore.getState().undo();
      }
      // Cmd+Shift+Z or Ctrl+Shift+Z for Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        useStore.getState().redo();
      }
      
      // Escape or Space to cancel current tool
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        if (useStore.getState().activeTool === 'wall') {
          useStore.getState().setDraftWall(null);
        }
        useStore.getState().setActiveTool('select');
        useStore.getState().setSelectedElementId(null);
      }
      
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'v') useStore.getState().setActiveTool('select');
      if (key === 'w') useStore.getState().setActiveTool('wall');
      if (key === 'd') useStore.getState().setActiveTool('door');
      if (key === 'n') useStore.getState().setActiveTool('window');
      if (key === 'f') useStore.getState().setActiveTool('fixture');
      if (key === 'm') useStore.getState().setActiveTool('measure');
      if (key === 'r') {
         useStore.getState().rotateSelectedFixture();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!currentPlan) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="text-center">
          <p className="text-lg font-medium">No Plan Active</p>
          <p className="text-sm">Describe a space in the chat to generate a plan.</p>
        </div>
      </div>
    );
  }

  // Calculate center offset so the plan isn't drawn at 0,0
  const defaultOffsetX = dimensions.width / 2 - (currentPlan?.metadata.total_sqft ? 10 * SCALE : 0);
  const defaultOffsetY = dimensions.height / 2 - (currentPlan?.metadata.total_sqft ? 10 * SCALE : 0);

  const stageX = stagePos ? stagePos.x : defaultOffsetX;
  const stageY = stagePos ? stagePos.y : defaultOffsetY;

  const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (activeTool !== 'wall' && activeTool !== 'measure' && activeTool !== 'door' && activeTool !== 'window') {
      if (mousePos) setMousePos(null);
      if (activeOpeningGhost) setActiveOpeningGhost(null);
      return;
    }
    const stage = e.target.getStage();
    if (!stage) return;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    
    let xFeet = (pointerPosition.x - stage.x()) / (SCALE * stageScale);
    let yFeet = (pointerPosition.y - stage.y()) / (SCALE * stageScale);
    
    // Compile all existing room vertices for endpoint snapping
    const allVertices: Point[] = [];
    if (currentPlan) {
      currentPlan.rooms.forEach(r => allVertices.push(...r.vertices));
    }
    
    let snapped = snapToEndpoint({x: xFeet, y: yFeet}, allVertices, 0.5);
    
    if (!snapped) {
       snapped = snapToGrid({x: xFeet, y: yFeet}, 1);
       // Shift key orthogonal snapping (detect via native event)
       if (e.evt.shiftKey && draftWall && draftWall.length > 0) {
         snapped = snapToAngle(snapped, draftWall[draftWall.length - 1]);
       }
    }
    
    setMousePos(snapped);

    // Opening Ghost logic
    if (activeTool === 'door' || activeTool === 'window') {
      if (currentPlan && currentPlan.rooms.length > 0) {
        const nearest = findNearestWallToPoint({x: xFeet, y: yFeet}, currentPlan.rooms, 3.0);
        if (nearest) {
            const w = nearest.wall as Wall;
            const start = Array.isArray(w.start) ? {x: w.start[0], y: w.start[1]} : w.start as Point;
            const end = Array.isArray(w.end) ? {x: w.end[0], y: w.end[1]} : w.end as Point;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            setActiveOpeningGhost({
               x: nearest.point.x,
               y: nearest.point.y,
               angle,
               width: activeTool === 'door' ? 3 : 4,
               type: activeTool
            });
            return;
        }
      }
      setActiveOpeningGhost(null);
    } else if (activeOpeningGhost) {
      setActiveOpeningGhost(null);
    }
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If clicking on empty stage (not a shape), deselect
    if (e.target === e.target.getStage() && activeTool === 'select') {
      setSelectedElementId(null);
    }

    // If we're just selecting/panning, do nothing else
    if (activeTool === 'select') return;

    // Get the absolute position of the click on the stage, accounting for drag panning
    const stage = e.target.getStage();
    if (!stage) return;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    
    let xFeet = (pointerPosition.x - stage.x()) / (SCALE * stageScale);
    let yFeet = (pointerPosition.y - stage.y()) / (SCALE * stageScale);

    if (activeTool === 'measure') {
      let snapTarget = snapToEndpoint({x: xFeet, y: yFeet}, currentPlan ? currentPlan.rooms.flatMap(r => r.vertices) : [], 0.5);
      if (!snapTarget) snapTarget = snapToGrid({x: xFeet, y: yFeet}, 1);
      
      if (!measureStart) {
        setMeasureStart(snapTarget);
      } else {
        setMeasureStart(null); // Click again to finish measurement
      }
      return;
    }

    if (activeTool === 'wall') {
      if (mousePos) {
        xFeet = mousePos.x;
        yFeet = mousePos.y;
      }
      
      // Check if clicking on the first point (closes polygon)
      if (draftWall && draftWall.length > 2) {
        const first = draftWall[0];
        if (Math.abs(first.x - xFeet) < 0.1 && Math.abs(first.y - yFeet) < 0.1) {
          commitDraftRoom();
          setMousePos(null);
          return;
        }
      }
      
      pushDraftPoint({x: xFeet, y: yFeet});
      return;
    }

    if (activeTool === 'room') {
      addRoomAt(Math.round(xFeet), Math.round(yFeet));
      setActiveTool('select'); // revert tool after use
    } else if (activeTool === 'fixture') {
      const fixType = useStore.getState().activeFixtureType || 'toilet';
      addFixtureAt(Math.round(xFeet), Math.round(yFeet), fixType);
      setActiveTool('select');
    } else if (activeTool === 'door' || activeTool === 'window') {
      useStore.getState().addOpeningAt(xFeet, yFeet, activeTool);
      setActiveTool('select');
    }
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    if (newScale < 0.2 || newScale > 5) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePos(newPos);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  };

  // Convert legacy walls or parse new ones 
  const renderWall = (wall: Wall) => {
    // Support either old array style or new object Point style
    const sx = Array.isArray(wall.start) ? wall.start[0] : (wall.start as Point).x;
    const sy = Array.isArray(wall.start) ? wall.start[1] : (wall.start as Point).y;
    const ex = Array.isArray(wall.end) ? wall.end[0] : (wall.end as Point).x;
    const ey = Array.isArray(wall.end) ? wall.end[1] : (wall.end as Point).y;
    
    const startX = sx * SCALE;
    const startY = sy * SCALE;
    const endX = ex * SCALE;
    const endY = ey * SCALE;
    const isSelected = selectedElementId === wall.id;

    // Professional blueprint wall color
    const wallColor = wall.type === 'exterior' ? '#1e293b' : '#334155'; // slate-800 exterior, slate-700 interior
    const strokeColor = isSelected ? '#5eead4' : wallColor; // highlight blue if selected
    const strokeWidth = wall.thickness * SCALE;

    return (
      <Group key={wall.id} onClick={(e) => { e.cancelBubble = true; setSelectedElementId(wall.id); }} onTap={(e) => { e.cancelBubble = true; setSelectedElementId(wall.id); }}>
        <Line
          points={[startX, startY, endX, endY]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          lineCap="square"
          lineJoin="miter"
          hitStrokeWidth={20}
        />
        {/* Render Openings (Doors/Windows) */}
        {wall.openings.map(opening => {
           const dx = endX - startX;
           const dy = endY - startY;
           const angle = Math.atan2(dy, dx);
           
           const openingCenterX = startX + Math.cos(angle) * (opening.position * SCALE);
           const openingCenterY = startY + Math.sin(angle) * (opening.position * SCALE);
           const openingWidthPx = opening.width * SCALE;

           return (
             <Group 
                key={opening.id}
                onClick={(e) => { e.cancelBubble = true; setSelectedElementId(opening.id); }}
                onTap={(e) => { e.cancelBubble = true; setSelectedElementId(opening.id); }}
             >
                {/* Cutout */}
                <Line
                  points={[
                    openingCenterX - Math.cos(angle) * (openingWidthPx/2),
                    openingCenterY - Math.sin(angle) * (openingWidthPx/2),
                    openingCenterX + Math.cos(angle) * (openingWidthPx/2),
                    openingCenterY + Math.sin(angle) * (openingWidthPx/2),
                  ]}
                  stroke="#0a0e14" // match canvas bg
                  strokeWidth={strokeWidth + 2}
                  hitStrokeWidth={20}
                />
                
                {opening.type === 'door' && (
                  <Line 
                    points={[
                      openingCenterX - Math.cos(angle) * (openingWidthPx/2),
                      openingCenterY - Math.sin(angle) * (openingWidthPx/2),
                      (openingCenterX - Math.cos(angle) * (openingWidthPx/2)) + Math.cos(angle + Math.PI/2) * openingWidthPx,
                      (openingCenterY - Math.sin(angle) * (openingWidthPx/2)) + Math.sin(angle + Math.PI/2) * openingWidthPx,
                    ]}
                    stroke={selectedElementId === opening.id ? "#5eead4" : "#2dd4bf"}
                    strokeWidth={selectedElementId === opening.id ? 4 : 2}
                    hitStrokeWidth={20}
                  />
                )}
                {opening.type === 'window' && (
                  <Line
                    points={[
                      openingCenterX - Math.cos(angle) * (openingWidthPx/2),
                      openingCenterY - Math.sin(angle) * (openingWidthPx/2),
                      openingCenterX + Math.cos(angle) * (openingWidthPx/2),
                      openingCenterY + Math.sin(angle) * (openingWidthPx/2),
                    ]}
                    stroke={selectedElementId === opening.id ? "#5eead4" : "#38bdf8"} // highlight or sky blue
                    strokeWidth={selectedElementId === opening.id ? 4 : 3}
                    hitStrokeWidth={20}
                  />
                )}
             </Group>
           );
        })}
      </Group>
    );
  };

  const renderFixture = (fixture: any, roomParams: { rx: number, ry: number }) => {
    const isSelected = selectedElementId === fixture.id;
    const hasError = validationIssues.some(i => i.elementId === fixture.id && i.type === 'error');
    const w = fixture.width * SCALE;
    const h = fixture.depth * SCALE;
    const fx = (roomParams.rx + fixture.x) * SCALE + w/2;
    const fy = (roomParams.ry + fixture.y) * SCALE + h/2;

    // IBC/IRC Clearance Zone Logic
    let clearanceDepthFt = 0;
    if (fixture.type === 'toilet' || fixture.type === 'sink') clearanceDepthFt = 1.75; // 21 inches
    else if (fixture.type === 'bathtub' || fixture.type === 'shower' || fixture.type === 'stove') clearanceDepthFt = 2.0; // 24 inches
    else if (fixture.type === 'bed' || fixture.type === 'sofa') clearanceDepthFt = 3.0; // 36 inches

    const clearancePx = clearanceDepthFt * SCALE;

    return (
      <Group 
        key={fixture.id}
        x={fx}
        y={fy}
        rotation={fixture.rotation || 0}
        onClick={(e) => { e.cancelBubble = true; setSelectedElementId(fixture.id); }}
        onTap={(e) => { e.cancelBubble = true; setSelectedElementId(fixture.id); }}
      >
        {/* Clearance Zone (Rendered behind fixture) */}
        {isSelected && clearancePx > 0 && (
           <Rect
             x={-w/2}
             y={h/2} // Front of the fixture
             width={w}
             height={clearancePx}
             fill="rgba(245, 158, 11, 0.1)" // amber tint
             stroke="#f59e0b" // amber-500
             strokeWidth={1}
             dash={[5, 5]}
           />
        )}
        
        <Rect
          x={-w/2}
          y={-h/2}
          width={w}
          height={h}
          fill={hasError ? "#451a1a" : "#1e293b"} // dark red or slate-800
          stroke={isSelected ? "#eff6ff" : (hasError ? "#ef4444" : "#475569")} 
          strokeWidth={isSelected || hasError ? 3 : 1}
          cornerRadius={fixture.type === 'toilet' ? 10 : 0}
        />
        <Text
           x={-w/2} y={-h/2} width={w} height={h}
           text={fixture.type.substring(0,3).toUpperCase()}
           fill="#94a3b8" fontSize={11} fontFamily="monospace"
           align="center" verticalAlign="middle"
        />
      </Group>
    );
  };

  // Format decimal feet into architectural feet-inches string
  const formatDimension = (feetDecimal: number) => {
    const feet = Math.floor(feetDecimal);
    const inches = Math.round((feetDecimal - feet) * 12);
    if (inches === 12) return `${feet + 1}'-0"`;
    return `${feet}'-${inches}"`;
  };

  // Helper to render dimensions for selected rooms
  const calculateLineDimensions = (x1: number, y1: number, x2: number, y2: number, text: string, color: string = "#2dd4bf", textColor: string = "#5eead4") => {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const textOffset = 15; // Distance of text from the line

    return (
      <Group>
        {/* Dimension Line */}
        <Line points={[x1, y1, x2, y2]} stroke={color} strokeWidth={1} />
        {/* Ticks */}
        <Line points={[x1, y1 - 5, x1, y1 + 5]} stroke={color} strokeWidth={1} />
        <Line points={[x2, y2 - 5, x2, y2 + 5]} stroke={color} strokeWidth={1} />
        {/* Text Label */}
        <Text
          x={midX}
          y={midY}
          text={text}
          fontSize={12}
          fill={textColor}
          fontFamily="monospace"
          align="center"
          offsetX={text.length * 3} // Adjust based on font size and length
          offsetY={-textOffset} // Position above the line
          rotation={angle * 180 / Math.PI} // Rotate text to align with line
        />
      </Group>
    );
  };

  const renderPolygonDimensions = (room: Room) => {
    if (!room.walls || room.walls.length === 0) return null;
    return (
      <Group key={`dims-${room.id}`}>
        {room.walls.map(wall => {
          const sx = Array.isArray(wall.start) ? wall.start[0] : (wall.start as Point).x;
          const sy = Array.isArray(wall.start) ? wall.start[1] : (wall.start as Point).y;
          const ex = Array.isArray(wall.end) ? wall.end[0] : (wall.end as Point).x;
          const ey = Array.isArray(wall.end) ? wall.end[1] : (wall.end as Point).y;

          const dx = ex - sx;
          const dy = ey - sy;
          const length = Math.sqrt(dx*dx + dy*dy);
          
          if (length < 0.1) return null;

          // normal vector (pointing 'out' roughly if CCW oriented)
          const normalX = -dy / length;
          const normalY = dx / length;
          
          // distance is 1.5 feet offset
          const offsetDist = 1.5;
          const ox = normalX * offsetDist;
          const oy = normalY * offsetDist;

          const text = formatDimension(length);

          return (
             <Group key={`dim-${wall.id}`}>
               {calculateLineDimensions(
                  (sx + ox) * SCALE,
                  (sy + oy) * SCALE,
                  (ex + ox) * SCALE,
                  (ey + oy) * SCALE,
                  text
               )}
             </Group>
          );
        })}
      </Group>
    );
  };

  const renderRoomBackground = (room: Room) => {
    const isSelected = selectedElementId === room.id;
    const hasError = validationIssues.some(i => i.elementId === room.id && i.type === 'error');
    const hasWarning = validationIssues.some(i => i.elementId === room.id && i.type === 'warning');
    
    let baseFill = "rgba(59,130,246,0.08)";
    if (hasError) baseFill = "rgba(239, 68, 68, 0.15)";
    else if (hasWarning) baseFill = "rgba(245, 158, 11, 0.15)";
    
    let baseStroke = isSelected ? "#5eead4" : (hasError ? "#ef4444" : (hasWarning ? "#f59e0b" : "transparent"));
    let strokeW = isSelected || hasError || hasWarning ? 4 : 0;
    
    // Find bounds for label placement and rendering legacy rectangles
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (room.vertices && room.vertices.length > 0) {
      room.vertices.forEach(v => {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      });
    } else {
      // Legacy fallback
      minX = room.x || 0;
      minY = room.y || 0;
      maxX = minX + (room.width || 0);
      maxY = minY + (room.length || 0);
    }
    
    const centerPoint = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2
    };

    return (
      <Group key={`bg-${room.id}`} onClick={(e) => { e.cancelBubble = true; setSelectedElementId(room.id); }} onTap={(e) => { e.cancelBubble = true; setSelectedElementId(room.id); }}>
         {room.vertices && room.vertices.length > 2 ? (
            <Line
              points={room.vertices.flatMap(v => [v.x * SCALE, v.y * SCALE])}
              closed={true}
              fill={baseFill} 
              stroke={baseStroke}
              strokeWidth={strokeW}
            />
         ) : (
           <Rect
              x={(room.x || 0) * SCALE}
              y={(room.y || 0) * SCALE}
              width={(room.width || 0) * SCALE}
              height={(room.length || 0) * SCALE}
              fill={baseFill}
              stroke={baseStroke} 
              strokeWidth={strokeW}
           />
         )}
         
         {/* Room Name Label */}
         <Text
           x={centerPoint.x * SCALE}
           y={centerPoint.y * SCALE}
           text={(room.label || room.name || '').toUpperCase()}
           fontSize={14}
           fill="#64748b" // slate-500
           fontFamily="sans-serif"
           fontStyle="bold"
           align="center"
           offsetX={((room.label || room.name || '').length * 4)} 
         />
         {/* Render fixtures inside room */}
         {room.fixtures.map(f => renderFixture(f, { rx: minX, ry: minY }))}
         
         {/* Render Dimensions if selected */}
         {isSelected && room.walls && room.walls.length > 0 && renderPolygonDimensions(room)}
      </Group>
    );
  };

  // Determine cursor based on tool
  let cursorClass = "cursor-move";
  if (activeTool === 'room') cursorClass = "cursor-crosshair";
  if (activeTool === 'fixture') cursorClass = "cursor-pointer";
  if (activeTool === 'wall') cursorClass = "cursor-crosshair";
  if (activeTool === 'measure') cursorClass = "cursor-crosshair";

  // Calculate display values for info bar
  const scalePercent = Math.round(stageScale * 100);
  const mouseFeetX = mousePos ? mousePos.x.toFixed(1) : '--';
  const mouseFeetY = mousePos ? mousePos.y.toFixed(1) : '--';

  return (
    <div ref={containerRef} className={`flex-1 overflow-hidden relative cad-grid ${cursorClass}`}>

      {/* Floating Info Bar - Bottom Left */}
      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-4 info-bar px-4 py-2.5 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <span className="text-[#6e7681]">Cursor:</span>
          <span className="text-[#2dd4bf] font-medium">{mouseFeetX}'</span>
          <span className="text-[#6e7681]">×</span>
          <span className="text-[#2dd4bf] font-medium">{mouseFeetY}'</span>
        </div>
        <div className="w-px h-4 bg-[#21262d]"></div>
        <div className="flex items-center gap-2">
          <span className="text-[#6e7681]">Zoom:</span>
          <span className="text-[#e6edf3] font-medium">{scalePercent}%</span>
        </div>
        <div className="w-px h-4 bg-[#21262d]"></div>
        <div className="flex items-center gap-2">
          <span className="text-[#6e7681]">Tool:</span>
          <span className="text-[#e6edf3] font-medium capitalize">{activeTool}</span>
        </div>
      </div>

      {/* Zoom Controls - Bottom Right */}
      <div className="absolute bottom-5 right-5 z-20 flex flex-col gap-1 animate-fade-in-up stagger-2">
        <button
          onClick={() => { setStageScale(stageScale * 1.2); }}
          className="w-8 h-8 bg-[#131920]/90 backdrop-blur border border-[#21262d] rounded-lg flex items-center justify-center text-[#8b949e] hover:text-[#2dd4bf] hover:border-[#2dd4bf]/50 transition-all"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => { setStageScale(1); setStagePos(null); }}
          className="w-8 h-8 bg-[#131920]/90 backdrop-blur border border-[#21262d] rounded-lg flex items-center justify-center text-[#8b949e] hover:text-[#2dd4bf] hover:border-[#2dd4bf]/50 transition-all text-xs font-mono"
          title="Reset View"
        >
          1:1
        </button>
        <button
          onClick={() => { setStageScale(stageScale / 1.2); }}
          className="w-8 h-8 bg-[#131920]/90 backdrop-blur border border-[#21262d] rounded-lg flex items-center justify-center text-[#8b949e] hover:text-[#2dd4bf] hover:border-[#2dd4bf]/50 transition-all"
          title="Zoom Out"
        >
          −
        </button>
      </div>

      {activeTool === 'wall' && mousePos && (
        <div
          className="absolute bg-[#131920]/95 backdrop-blur border border-[#2dd4bf]/30 text-[#2dd4bf] font-mono text-xs px-2 py-1 rounded-lg shadow-lg pointer-events-none z-50 transform translate-x-4 -translate-y-8"
          style={{ left: (mousePos.x * SCALE * stageScale) + stageX, top: (mousePos.y * SCALE * stageScale) + stageY }}
        >
          {mousePos.x.toFixed(1)}', {mousePos.y.toFixed(1)}'
        </div>
      )}

      {currentPlan && <CanvasToolbar />}

      <Stage 
        width={dimensions.width} 
        height={dimensions.height}
        draggable={activeTool === 'select'}
        x={stageX}
        y={stageY}
        scaleX={stageScale}
        scaleY={stageScale}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
      >
        <Layer>
          {/* 1. Draw Room Backgrounds first */}
          {currentPlan.rooms.map(room => renderRoomBackground(room))}
          
          {/* 2. Draw Walls and Openings */}
          {currentPlan.rooms.map(room => 
             room.walls.map(wall => renderWall(wall))
          )}

          {/* 3. Draft Wall Drawing Layer */}
          {activeTool === 'wall' && draftWall && draftWall.length > 0 && (
             <Group>
               {/* Connected segments */}
               <Line 
                 points={draftWall.flatMap(p => [p.x * SCALE, p.y * SCALE])}
                 stroke="#5eead4"
                 strokeWidth={3}
                 lineCap="square"
                 lineJoin="miter"
                 dash={[10, 5]}
               />
               
               {/* Line from last point to current mouse */}
               {mousePos && (
                 <Line
                   points={[
                     draftWall[draftWall.length - 1].x * SCALE, 
                     draftWall[draftWall.length - 1].y * SCALE,
                     mousePos.x * SCALE,
                     mousePos.y * SCALE
                   ]}
                   stroke="#94a3b8"
                   strokeWidth={2}
                   dash={[5, 5]}
                 />
               )}

               {/* Vertex nodes */}
               {draftWall.map((p, i) => (
                 <Circle key={i} x={p.x * SCALE} y={p.y * SCALE} radius={4} fill="#5eead4" />
               ))}
               
               {/* Mouse node */}
               {mousePos && (
                 <Circle x={mousePos.x * SCALE} y={mousePos.y * SCALE} radius={4} fill="#e2e8f0" />
               )}

               {/* Active Dimension Length Text */}
               {mousePos && draftWall.length > 0 && (
                 <Text
                   x={((draftWall[draftWall.length - 1].x + mousePos.x) / 2) * SCALE}
                   y={((draftWall[draftWall.length - 1].y + mousePos.y) / 2) * SCALE - 15}
                   text={`${Math.round(Math.sqrt(Math.pow(mousePos.x - draftWall[draftWall.length - 1].x, 2) + Math.pow(mousePos.y - draftWall[draftWall.length - 1].y, 2)))}'`}
                   fill="#94a3b8"
                   fontSize={12}
                   fontFamily="monospace"
                   align="center"
                   offsetX={10}
                 />
               )}
             </Group>
          )}

           {/* 4. Draw Fixtures */}
           {currentPlan.rooms.map(room => 
             <Group key={`fixtures-${room.id}`}>
               {/* Fixtures are rendered via renderRoomBackground now to keep z-index correct, but we'll leave this empty for now so we don't draw them twice */}
             </Group>
           )}

           {/* 5. Measure Tool Layer */}
           {activeTool === 'measure' && measureStart && mousePos && (
             <Group>
               <Line
                 points={[
                   measureStart.x * SCALE,
                   measureStart.y * SCALE,
                   mousePos.x * SCALE,
                   mousePos.y * SCALE
                 ]}
                 stroke="#f59e0b" // amber-500
                 strokeWidth={2}
                 dash={[5, 5]}
               />
               
               {calculateLineDimensions(
                  measureStart.x * SCALE,
                  measureStart.y * SCALE,
                  mousePos.x * SCALE,
                  mousePos.y * SCALE,
                  formatDimension(Math.sqrt(Math.pow(mousePos.x - measureStart.x, 2) + Math.pow(mousePos.y - measureStart.y, 2))),
                  "#f59e0b",
                  "#fbbf24"
               )}

               <Circle x={measureStart.x * SCALE} y={measureStart.y * SCALE} radius={4} fill="#f59e0b" />
               <Circle x={mousePos.x * SCALE} y={mousePos.y * SCALE} radius={4} fill="#fcd34d" />
             </Group>
           )}
        </Layer>
      </Stage>
    </div>
  );
};

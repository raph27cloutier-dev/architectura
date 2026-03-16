import { Point, Wall } from '../types/plan';

/**
 * Calculates the distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Projects a point onto a line segment (a wall) and returns the closest point on that segment.
 * Also returns `t`, the normalized position [0, 1] along the segment.
 */
export function projectPointOnLineSegment(p: Point, a: Point, b: Point): { point: Point, t: number } {
  const l2 = distance(a, b) ** 2;
  if (l2 === 0) return { point: a, t: 0 };
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return { 
    point: { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) },
    t 
  };
}

/**
 * Calculates the area of a non-self-intersecting polygon given its ordered vertices.
 * Uses the Shoelace formula. 
 * Assumes coordinates are in feet, so the return value is in square feet.
 */
export function calculatePolygonArea(vertices: Point[]): number {
  if (vertices.length < 3) return 0;
  
  let area = 0;
  const n = vertices.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Ray-casting algorithm to determine if a point is inside a polygon.
 */
export function pointInPolygon(point: Point, vs: Point[]): boolean {
  let x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i].x, yi = vs[i].y;
    let xj = vs[j].x, yj = vs[j].y;
    let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Bounds a point to the nearest grid increment.
 * @param p The point to snap
 * @param gridSize The grid size in feet (e.g. 1)
 */
export function snapToGrid(p: Point, gridSize: number = 1): Point {
  return {
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize
  };
}

/**
 * Snaps a target point to 0, 45, or 90 degree increments relative to an origin point.
 */
export function snapToAngle(target: Point, origin: Point): Point {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  
  const angle = Math.atan2(dy, dx); // radians
  const angleDegrees = (angle * 180) / Math.PI;
  
  // Snap to nearest 45 degrees
  const snappedDegrees = Math.round(angleDegrees / 45) * 45;
  const snappedRadians = (snappedDegrees * Math.PI) / 180;
  
  const dist = distance(origin, target);
  
  return {
    x: origin.x + Math.cos(snappedRadians) * dist,
    y: origin.y + Math.sin(snappedRadians) * dist
  };
}

/**
 * Checks if a point is close to an existing vertex across all rooms (Endpoint Snapping).
 * Returns the snapped point if within threshold, otherwise null.
 */
export function snapToEndpoint(target: Point, allVertices: Point[], thresholdInFeet: number = 0.5): Point | null {
  let closest: Point | null = null;
  let minDistance = Infinity;

  for (const v of allVertices) {
    const dist = distance(target, v);
    if (dist < minDistance && dist <= thresholdInFeet) {
      minDistance = dist;
      closest = { x: v.x, y: v.y }; 
    }
  }

  return closest;
}

/**
 * Generates an automated label for a new room (e.g. "Room 1", "Room 2")
 */
export function getNextRoomLabel(existingLabels: string[]): string {
  let counter = 1;
  let prospect = `Room ${counter}`;
  while (existingLabels.includes(prospect)) {
    counter++;
    prospect = `Room ${counter}`;
  }
  return prospect;
}

/**
 * Calculates walls from an ordered list of closed polygon vertices.
 */
export function calculateWallsFromVertices(vertices: Point[]): Wall[] {
  const walls: Wall[] = [];
  const n = vertices.length;
  
  for (let i = 0; i < n; i++) {
    const start = vertices[i];
    const end = vertices[(i + 1) % n];
    
    // Using a rudimentary uuid generator for the utility since we can't easily import uuidv4 if we want to keep it pure,
    // but in reality we should assign real UUIDs. We'll let the caller override IDs if needed.
    const id = `w_${Math.random().toString(36).substring(2, 9)}`;
    
    walls.push({
      id,
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      type: 'interior',  // default
      thickness: 0.33,   // default 4"
      openings: []
    });
  }
  
  return walls;
}

/**
 * Iterates over all rooms and their walls to find the absolute closest wall to a target point.
 * Returns the IDs and the relative position `t` (0 to 1) along the wall segment.
 */
export function findNearestWallToPoint(target: Point, rooms: import('../types/plan').Room[], thresholdInFeet: number = 3) {
  let closestWall: import('../types/plan').Wall | null = null;
  let closestRoomId: string = '';
  let minDistance = Infinity;
  let closestT = 0;
  let projectedPoint: Point = {x: 0, y: 0};

  rooms.forEach(room => {
    room.walls.forEach(w => {
      const start = Array.isArray(w.start) ? {x: w.start[0], y: w.start[1]} : w.start as Point;
      const end = Array.isArray(w.end) ? {x: w.end[0], y: w.end[1]} : w.end as Point;
      
      const proj = projectPointOnLineSegment(target, start, end);
      const dist = distance(target, proj.point);
      
      if (dist < minDistance && dist <= thresholdInFeet) {
        minDistance = dist;
        closestWall = w;
        closestRoomId = room.id;
        closestT = proj.t;
        projectedPoint = proj.point;
      }
    });
  });

  if (!closestWall) return null;

  return {
    roomId: closestRoomId,
    wall: closestWall,
    t: closestT,
    point: projectedPoint,
    distance: minDistance
  };
}

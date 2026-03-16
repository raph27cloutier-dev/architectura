import { Point, Wall, Room } from '../types/plan';
import { distance } from './geometry';
import { v4 as uuidv4 } from 'uuid';

// Graph representations
interface Node {
  id: string; // "x,y" string representation
  point: Point;
  edges: Set<string>; // neighbor node IDs
}

// Helper to reliably stringify points to act as map keys, using consistent precision mapping
function pt2str(p: Point): string {
  // Round to nearest 0.05 to handle floating point fuzziness in intersections
  const x = Math.round(p.x * 20) / 20;
  const y = Math.round(p.y * 20) / 20;
  return `${x},${y}`;
}

// -------------------------------------------------------------
// 1. Line Intersection Engine
// -------------------------------------------------------------

function doIntersect(p1: Point, q1: Point, p2: Point, q2: Point): Point | null {
  const x1 = p1.x, y1 = p1.y;
  const x2 = q1.x, y2 = q1.y;
  const x3 = p2.x, y3 = p2.y;
  const x4 = q2.x, y4 = q2.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.001) return null; // parallel

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }
  return null;
}

/**
 * Takes an arbitrary soup of walls, finds all intersections, and chops them into minimal 
 * non-overlapping segments.
 */
function segmentWalls(walls: Wall[]): { nodes: Map<string, Node>, edges: [string, string][] } {
  const pointsOnWall: Map<string, Point[]> = new Map(); // wall.id -> list of points on it
  
  // Track all start/end nodes
  walls.forEach(w => {
    pointsOnWall.set(w.id, [w.start, w.end]);
  });

  // Calculate all pairwise intersections
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const w1 = walls[i];
      const w2 = walls[j];
      
      const intersection = doIntersect(w1.start, w1.end, w2.start, w2.end);
      if (intersection) {
        pointsOnWall.get(w1.id)!.push(intersection);
        pointsOnWall.get(w2.id)!.push(intersection);
      }
    }
  }

  // Build the graph
  const nodes = new Map<string, Node>();
  const edges: [string, string][] = [];

  pointsOnWall.forEach((points, wallId) => {
    if (points.length < 2) return;
    
    // Sort points linearly along this specific wall
    const startNode = points[0]; // first point is always original start
    points.sort((a, b) => distance(startNode, a) - distance(startNode, b));
    
    // Deduplicate very close points (fuzz filtering)
    const distinctPoints: Point[] = [];
    for (const p of points) {
      if (distinctPoints.length === 0 || distance(distinctPoints[distinctPoints.length - 1], p) > 0.05) {
        distinctPoints.push(p);
      }
    }
    
    // Add segments as edges and vertices as nodes
    for (let i = 0; i < distinctPoints.length - 1; i++) {
        const pA = distinctPoints[i];
        const pB = distinctPoints[i + 1];
        
        const idA = pt2str(pA);
        const idB = pt2str(pB);
        
        if (!nodes.has(idA)) nodes.set(idA, { id: idA, point: pA, edges: new Set() });
        if (!nodes.has(idB)) nodes.set(idB, { id: idB, point: pB, edges: new Set() });
        
        nodes.get(idA)!.edges.add(idB);
        nodes.get(idB)!.edges.add(idA);
        
        edges.push([idA, idB]);
    }
  });

  return { nodes, edges };
}

// -------------------------------------------------------------
// 2. Minimum Cycle Basis (Find Polygons)
// -------------------------------------------------------------

function angleBetween(pOrig: Point, pDest: Point): number {
  return Math.atan2(pDest.y - pOrig.y, pDest.x - pOrig.x);
}

function normalizeAngle(a: number): number {
  let A = a % (2 * Math.PI);
  if (A <= -Math.PI) A += 2 * Math.PI;
  if (A > Math.PI) A -= 2 * Math.PI;
  return A;
}

/**
 * Traces the "right-most" path around a graph face. 
 */
function extractFaces(nodes: Map<string, Node>): Point[][] {
  // Directed edges tracking to avoid tracing the same face twice
  const visitedHalfEdges = new Set<string>();
  const faces: Point[][] = [];

  nodes.forEach(node => {
    node.edges.forEach(neighborId => {
      const edgeKey = `${node.id}->${neighborId}`;
      if (visitedHalfEdges.has(edgeKey)) return;
      
      const faceNodes: string[] = [];
      let currentId = node.id;
      let nextId = neighborId;
      
      while (!visitedHalfEdges.has(`${currentId}->${nextId}`)) {
        visitedHalfEdges.add(`${currentId}->${nextId}`);
        faceNodes.push(currentId);
        
        const currNode = nodes.get(currentId)!;
        const nextNode = nodes.get(nextId)!;
        
        // Arrived at nextNode. Which way do we turn to keep the face on our right?
        const arrivalAngle = angleBetween(currNode.point, nextNode.point);
        
        let bestTurn = -Infinity; // we want the sharpest right turn relative to arrival
        let bestNeighbor = "";
        
        nextNode.edges.forEach(nId => {
          if (nId === currentId && nextNode.edges.size > 1) return; // don't go back unless it's a dead end
          
          const nNode = nodes.get(nId)!;
          const departureAngle = angleBetween(nextNode.point, nNode.point);
          
          // Compute turning angle: positive is left, negative is right
          let turn = normalizeAngle(departureAngle - arrivalAngle);
          
          // We want the most rightward turn. Maximize the negative turn.
          // e.g. a sharp right is -PI/2. A sharp left is +PI/2.
          // Actually, if we map everything relative to "backwards":
          // The edge we came from is at turn = +-PI.
          // By sorting angles monotonically clockwise, we pick the first one.
          if (turn === 0 || turn === -0) turn = Math.PI * 2; // Straight ahead is 0. 
          if (turn < 0) turn += 2 * Math.PI; // normalize to 0..2PI relative to current heading

          if (turn > bestTurn) {
             bestTurn = turn;
             bestNeighbor = nId;
          }
        });
        
        if (!bestNeighbor) break; // should not happen in connected component > 1 edges
        
        currentId = nextId;
        nextId = bestNeighbor;
        
        if (currentId === node.id && nextId === neighborId) {
          // Closed cycle!
          faces.push(faceNodes.map(id => nodes.get(id)!.point));
          break;
        }
      }
    });
  });

  return filterFaces(faces);
}

// Filters out the huge outer boundary polygon (which has negative area mathematically in our trace orientation)
// and handles cleanup of the faces.
function filterFaces(faces: Point[][]): Point[][] {
    const valid: Point[][] = [];
    
    for (const vertices of faces) {
        if (vertices.length < 3) continue;
        
        let area = 0;
        const n = vertices.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += vertices[i].x * vertices[j].y;
            area -= vertices[j].x * vertices[i].y;
        }
        
        area = area / 2;
        
        // Counter-clockwise vs Clockwise trace. 
        // Based on our "rightmost" trace algorithm, the real bounded internal regions 
        // evaluate to a specific sign, while the outer shell goes the other way.
        if (area > 5) { // Minimum threshold 5 sqft to suppress slivers and the outer hole
             // ensure standard CCW or CW ordering output if requested by graphics later
             valid.push(vertices);
        }
    }
    
    return valid;
}

// -------------------------------------------------------------
// 3. Main Export
// -------------------------------------------------------------

/**
 * Takes the raw drawn walls and detects all enclosed rooms.
 */
export function detectRoomsFromWalls(walls: Wall[]): Room[] {
    const { nodes } = segmentWalls(walls);
    const faces = extractFaces(nodes);
    
    const rooms: Room[] = faces.map((vertices, i) => {
        // Reconstruct walls for the room border from the vertices
        const roomWalls: Wall[] = [];
        for (let j = 0; j < vertices.length; j++) {
            roomWalls.push({
                id: `w_detect_${uuidv4()}`,
                start: vertices[j],
                end: vertices[(j + 1) % vertices.length],
                type: 'interior', // Can refine later based on edge sharing
                thickness: 0.33,
                openings: [] // Openings extraction logic must be ported locally later
            });
        }
        
        // Find rough center and bounding box for legacy rendering
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        vertices.forEach(v => {
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.y > maxY) maxY = v.y;
        });

        return {
            id: `r_detect_${uuidv4()}`,
            label: `Detected Room ${i+1}`,
            name: `Detected Room ${i+1}`, // legacy fallback
            type: 'living',
            vertices,
            walls: roomWalls,
            fixtures: [],
            // legacy fallbacks
            x: minX,
            y: minY,
            width: maxX - minX,
            length: maxY - minY
        };
    });

    return rooms;
}

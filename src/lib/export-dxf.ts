import { saveAs } from 'file-saver';
import { PlanJSON, Wall, Room, Point, Fixture } from '../types/plan';

/**
 * Builds a valid DXF string representation of the floor plan geometry.
 */
export function generateDXF(plan: PlanJSON): string {
  // DXF Header
  let dxf = `  0
SECTION
  2
HEADER
  9
$ACADVER
  1
AC1009
  0
ENDSEC
  0
SECTION
  2
TABLES
  0
ENDSEC
  0
SECTION
  2
BLOCKS
  0
ENDSEC
  0
SECTION
  2
ENTITIES
`;

  const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string = '0') => {
    dxf += `  0
LINE
  8
${layer}
 10
${x1.toFixed(4)}
 20
${-y1.toFixed(4)}
 30
0.0
 11
${x2.toFixed(4)}
 21
${-y2.toFixed(4)}
 31
0.0
`;
  };

  const addCircle = (cx: number, cy: number, radius: number, layer: string = '0') => {
    dxf += `  0
CIRCLE
  8
${layer}
 10
${cx.toFixed(4)}
 20
${-cy.toFixed(4)}
 30
0.0
 40
${radius.toFixed(4)}
`;
  };
  
  const addArc = (cx: number, cy: number, radius: number, startAngleDeg: number, endAngleDeg: number, layer: string = '0') => {
    dxf += `  0
ARC
  8
${layer}
 10
${cx.toFixed(4)}
 20
${-cy.toFixed(4)}
 30
0.0
 40
${radius.toFixed(4)}
 50
${startAngleDeg.toFixed(4)}
 51
${endAngleDeg.toFixed(4)}
`;
  };

  const addText = (text: string, x: number, y: number, height: number, layer: string = '0') => {
    dxf += `  0
TEXT
  8
${layer}
 10
${x.toFixed(4)}
 20
${-y.toFixed(4)}
 30
0.0
 40
${height.toFixed(4)}
  1
${text}
`;
  };

  // Iterate over rooms
  plan.rooms.forEach(room => {
    // 1. Draw Room Walls
    room.walls.forEach(wall => {
      const sx = Array.isArray(wall.start) ? wall.start[0] : (wall.start as Point).x;
      const sy = Array.isArray(wall.start) ? wall.start[1] : (wall.start as Point).y;
      const ex = Array.isArray(wall.end) ? wall.end[0] : (wall.end as Point).x;
      const ey = Array.isArray(wall.end) ? wall.end[1] : (wall.end as Point).y;
      
      const layer = wall.type === 'exterior' ? 'WALLS_EXTERIOR' : 'WALLS_INTERIOR';
      
      // We will export a simplified centerline representation of the walls for CAD
      addLine(sx, sy, ex, ey, layer);
      
      // 2. Export Openings (Doors/Windows)
      wall.openings.forEach(opening => {
         const dx = ex - sx;
         const dy = ey - sy;
         const angle = Math.atan2(dy, dx);
         const openingCenterX = sx + Math.cos(angle) * opening.position;
         const openingCenterY = sy + Math.sin(angle) * opening.position;
         const halfW = opening.width / 2;
         
         const ox1 = openingCenterX - Math.cos(angle) * halfW;
         const oy1 = openingCenterY - Math.sin(angle) * halfW;
         const ox2 = openingCenterX + Math.cos(angle) * halfW;
         const oy2 = openingCenterY + Math.sin(angle) * halfW;

         if (opening.type === 'window') {
           // Draw window spanning the cutout
           addLine(ox1, oy1, ox2, oy2, 'WINDOWS');
         } else if (opening.type === 'door') {
           // Draw door panel
           const doorEndX = ox1 + Math.cos(angle + Math.PI/2) * opening.width;
           const doorEndY = oy1 + Math.sin(angle + Math.PI/2) * opening.width;
           addLine(ox1, oy1, doorEndX, doorEndY, 'DOORS');
           
           // Draw door arc
           let startDeg = (angle * 180 / Math.PI);
           let endDeg = startDeg + 90;
           // The Y axis is inverted in DXF vs Canvas
           addArc(ox1, oy1, opening.width, -endDeg, -startDeg, 'DOORS_SWING');
         }
      });
    });

    // 3. Draw Room Label
    const centerPoint = room.vertices.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 });
    centerPoint.x /= room.vertices.length;
    centerPoint.y /= room.vertices.length;
    
    addText((room.label || room.name || 'Room').toUpperCase(), centerPoint.x, centerPoint.y, 1.0, 'LABELS');

    // 4. Draw Fixtures
    room.fixtures.forEach(fixture => {
      // Find bounding box logic
      const minX = Math.min(...room.vertices.map(v => v.x));
      const minY = Math.min(...room.vertices.map(v => v.y));

      const cx = minX + fixture.x + (fixture.width / 2);
      const cy = minY + fixture.y + (fixture.depth / 2);
      
      // For DXF, represent fixtures as basic boxes for simplicity, with a label inside
      const fx1 = cx - (fixture.width / 2);
      const fy1 = cy - (fixture.depth / 2);
      const fx2 = cx + (fixture.width / 2);
      const fy2 = cy + (fixture.depth / 2);
      
      // Rotate points if necessary
      const rad = (fixture.rotation || 0) * (Math.PI / 180);
      const rotatePt = (px: number, py: number) => {
        const nx = Math.cos(rad) * (px - cx) - Math.sin(rad) * (py - cy) + cx;
        const ny = Math.sin(rad) * (px - cx) + Math.cos(rad) * (py - cy) + cy;
        return { x: nx, y: ny };
      };

      const p1 = rotatePt(fx1, fy1);
      const p2 = rotatePt(fx2, fy1);
      const p3 = rotatePt(fx2, fy2);
      const p4 = rotatePt(fx1, fy2);

      addLine(p1.x, p1.y, p2.x, p2.y, 'FIXTURES');
      addLine(p2.x, p2.y, p3.x, p3.y, 'FIXTURES');
      addLine(p3.x, p3.y, p4.x, p4.y, 'FIXTURES');
      addLine(p4.x, p4.y, p1.x, p1.y, 'FIXTURES');
      
      addText(fixture.type.toUpperCase().substring(0, 3), cx - 0.5, cy, 0.5, 'FIXTURES');
    });
  });

  dxf += `  0
ENDSEC
  0
EOF
`;
  return dxf;
}

/**
 * Triggers a browser download of the current plan as a DXF file.
 */
export function downloadPlanAsDXF(plan: PlanJSON) {
  const dxfContent = generateDXF(plan);
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  saveAs(blob, 'planbot_export.dxf');
}

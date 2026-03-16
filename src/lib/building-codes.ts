import { PlanJSON, Room, Fixture } from '../types/plan';
import { calculatePolygonArea } from './geometry';

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning';
  elementId: string; // The room or fixture ID this relates to
  message: string;
  codeReference: string; // e.g. "IRC R304.1"
}

export function validatePlan(plan: PlanJSON): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!plan || !plan.rooms) return issues;

  plan.rooms.forEach(room => {
    // Basic Habitable Area Rule (IRC R304.1)
    if (['living', 'bedroom', 'dining'].includes(room.type)) {
      let area = 0;
      if (room.vertices && room.vertices.length > 2) {
        area = calculatePolygonArea(room.vertices);
      } else {
        area = (room.width || 0) * (room.length || 0);
      }
      
      if (area > 0 && area < 70) {
        issues.push({
          id: `val_${Math.random().toString(36).substring(2,9)}`,
          type: 'error',
          elementId: room.id,
          message: `Habitable room area (${Math.round(area)} sqft) must be at least 70 sqft.`,
          codeReference: 'IRC R304.1'
        });
      }

      // Minimum room dimension (IRC R304.2)
      // For a quick check, if it's rectangular we check width/length.
      // For polygons, we check the shortest wall length.
      if (room.walls) {
        let minWall = Infinity;
        room.walls.forEach(w => {
           let sx: number, sy: number, ex: number, ey: number;
           if (Array.isArray(w.start)) { sx = w.start[0]; sy = w.start[1]; } else { sx = w.start.x; sy = w.start.y; }
           if (Array.isArray(w.end)) { ex = w.end[0]; ey = w.end[1]; } else { ex = w.end.x; ey = w.end.y; }
           const len = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2));
           if (len > 0.1 && len < minWall) minWall = len;
        });
        
        // This is a rough estimation; actual IRC states no dimension < 7ft in any direction.
        if (minWall !== Infinity && minWall < 7) {
           issues.push({
             id: `val_${Math.random().toString(36).substring(2,9)}`,
             type: 'error',
             elementId: room.id,
             message: `Habitable room dimension is less than 7 feet in one direction.`,
             codeReference: 'IRC R304.2'
           });
        }
      }
    }

    // Bathroom Fixture Checks (IRC R307.1)
    if (room.type === 'bathroom') {
       if (!room.fixtures || room.fixtures.length === 0) {
          issues.push({
            id: `val_${Math.random().toString(36).substring(2,9)}`,
            type: 'warning',
            elementId: room.id,
            message: `Bathroom has no fixtures defined.`,
            codeReference: 'IRC R307.1'
          });
       } else {
          // Check if toilet exists
          const hasToilet = room.fixtures.some(f => f.type === 'toilet');
          const hasSink = room.fixtures.some(f => f.type === 'sink');
          
          if (hasToilet && !hasSink) {
             issues.push({
               id: `val_${Math.random().toString(36).substring(2,9)}`,
               type: 'error',
               elementId: room.id,
               message: `Bathroom with toilet must have a sink.`,
               codeReference: 'IRC R307.1'
             });
          }
       }
    }

    // Fixture Spacing / General Warnings
    room.fixtures?.forEach(fixture => {
       if (fixture.type === 'toilet') {
          // Theoretically we would measure distance to nearest wall here.
          // For now, emit a warning if the room isn't wide enough.
          if ((room.width && room.width < 2.5)) {
             issues.push({
               id: `val_${Math.random().toString(36).substring(2,9)}`,
               type: 'error',
               elementId: fixture.id,
               message: `Toilet compartment must be at least 30 inches (2.5ft) wide.`,
               codeReference: 'IRC R307.1'
             });
          }
       }
    });

  });

  return issues;
}

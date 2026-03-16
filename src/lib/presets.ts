import { PlanJSON } from '../types/plan';

export function getBasicMockPlan(): PlanJSON {
  return {
    metadata: { total_sqft: 300, floors: 1, bedrooms: 0, bathrooms: 0 },
    rooms: [
      {
        id: 'r1', label: 'Open Living Space', type: 'living',
        vertices: [{x:0,y:0}, {x:20,y:0}, {x:20,y:15}, {x:0,y:15}],
        x: 0, y: 0, width: 20, length: 15, name: 'Open Living Space',
        fixtures: [],
        walls: [
          { id: 'w1', start: {x:0, y:0}, end: {x:20, y:0}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w2', start: {x:20, y:0}, end: {x:20, y:15}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w3', start: {x:20, y:15}, end: {x:0, y:15}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o1', type: 'door', position: 0.5, width: 3, properties: { swing: 'left', height: 6.67 } }] },
          { id: 'w4', start: {x:0, y:15}, end: {x:0, y:0}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o2', type: 'window', position: 0.3, width: 4, properties: { sillHeight: 3, height: 4 } }] },
        ]
      }
    ]
  };
}

export function getMockPlanWithBathroom(): PlanJSON {
  const plan = getBasicMockPlan();
  plan.metadata.bathrooms = 1;
  plan.metadata.total_sqft = 348;
  plan.rooms.push({
    id: 'r2', label: 'Bathroom', type: 'bathroom',
    vertices: [{x:0,y:0}, {x:8,y:0}, {x:8,y:6}, {x:0,y:6}],
    x: 0, y: 0, width: 8, length: 6, name: 'Bathroom',
    fixtures: [
      { id: 'f1', type: 'toilet', position: {x:1, y:1}, x: 1, y: 1, width: 1.5, depth: 2.2, rotation: 0 },
      { id: 'f2', type: 'bathtub', position: {x:4, y:0}, x: 4, y: 0, width: 4, depth: 2.5, rotation: 0 }
    ],
    walls: [
      { id: 'w5', start: {x:8, y:0}, end: {x:8, y:6}, type: 'interior', thickness: 0.33, openings: [] },
      { id: 'w6', start: {x:8, y:6}, end: {x:0, y:6}, type: 'interior', thickness: 0.33, openings: [{ id: 'o3', type: 'door', position: 0.25, width: 2.5, properties: { swing: 'right', height: 6.67 } }] }
    ]
  });
  return plan;
}

export function getMockStudioPlan(): PlanJSON {
  return {
    metadata: { total_sqft: 288, floors: 1, bedrooms: 0, bathrooms: 1, style: 'Studio' },
    rooms: [
      {
        id: 'studio_main', label: 'Main Studio Area', type: 'living' as const,
        vertices: [{x:0,y:0}, {x:18,y:0}, {x:18,y:16}, {x:0,y:16}],
        x: 0, y: 0, width: 18, length: 16, name: 'Main Studio Area',
        fixtures: [
          { id: 'f_sink', type: 'sink', position: {x:15, y:2}, x: 15, y: 2, width: 3, depth: 2, rotation: 0 },
          { id: 'f_stove', type: 'stove', position: {x:15, y:5}, x: 15, y: 5, width: 3, depth: 2.5, rotation: 0 },
          { id: 'f_fridge', type: 'fridge', position: {x:15, y:8}, x: 15, y: 8, width: 3, depth: 3, rotation: 0 }
        ],
        walls: [
          { id: 'w_ext1', start: {x:0, y:0}, end: {x:18, y:0}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o_win1', type: 'window', position: 0.2, width: 4, properties: { height: 4, sillHeight: 3 } }, { id: 'o_win2', type: 'window', position: 0.6, width: 4, properties: { height: 4, sillHeight: 3 } }] },
          { id: 'w_ext2', start: {x:18, y:0}, end: {x:18, y:16}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_ext3', start: {x:18, y:16}, end: {x:0, y:16}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o_door_main', type: 'door', position: 0.5, width: 3, properties: { swing: 'left', height: 6.67 } }] },
          { id: 'w_ext4', start: {x:0, y:16}, end: {x:0, y:0}, type: 'exterior', thickness: 0.5, openings: [] },
        ]
      },
      {
        id: 'studio_bath', label: 'Bathroom', type: 'bathroom' as const,
        vertices: [{x:0,y:10}, {x:6,y:10}, {x:6,y:16}, {x:0,y:16}],
        x: 0, y: 10, width: 6, length: 6, name: 'Bathroom',
        fixtures: [
          { id: 'f_bathtoilet', type: 'toilet', position: {x:1, y:1}, x: 1, y: 1, width: 1.5, depth: 2, rotation: 0 },
          { id: 'f_bathshower', type: 'shower', position: {x:3, y:0.5}, x: 3, y: 0.5, width: 3, depth: 3, rotation: 0 }
        ],
        walls: [
          { id: 'w_bath1', start: {x:6, y:10}, end: {x:6, y:16}, type: 'interior', thickness: 0.33, openings: [{ id: 'o_door_bath', type: 'door', position: 0.5, width: 2.5, properties: { swing: 'right', height: 6.67 } }] },
          { id: 'w_bath2', start: {x:6, y:10}, end: {x:0, y:10}, type: 'interior', thickness: 0.33, openings: [] }
        ]
      }
    ]
  };
}

export function get2BedroomPlan(): PlanJSON {
  return {
    metadata: { total_sqft: 900, floors: 1, bedrooms: 2, bathrooms: 1 },
    rooms: [
      {
        id: 'r_living', label: 'Living Room', type: 'living',
        vertices: [{x:0,y:0}, {x:24,y:0}, {x:24,y:16}, {x:0,y:16}],
        x: 0, y: 0, width: 24, length: 16, name: 'Living Room',
        fixtures: [
          { id: 'f_sofa', type: 'sofa', position: {x:2, y:2}, x: 2, y: 2, width: 7, depth: 3, rotation: 0 },
        ],
        walls: [
          { id: 'w_l1', start: {x:0, y:0}, end: {x:24, y:0}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o_win_l1', type: 'window', position: 0.4, width: 5, properties: { sillHeight: 3, height: 4 } }] },
          { id: 'w_l2', start: {x:24, y:0}, end: {x:24, y:16}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_l3', start: {x:24, y:16}, end: {x:0, y:16}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o_door_front', type: 'door', position: 0.5, width: 3, properties: { swing: 'left', height: 6.67 } }] },
          { id: 'w_l4', start: {x:0, y:16}, end: {x:0, y:0}, type: 'exterior', thickness: 0.5, openings: [] },
        ]
      },
      {
        id: 'r_bed1', label: 'Bedroom 1', type: 'bedroom',
        vertices: [{x:0,y:-14}, {x:12,y:-14}, {x:12,y:0}, {x:0,y:0}],
        x: 0, y: -14, width: 12, length: 14, name: 'Bedroom 1',
        fixtures: [
          { id: 'f_bed1', type: 'bed', position: {x:2, y:2}, x: 2, y: 2, width: 5, depth: 6.5, rotation: 0 },
        ],
        walls: [
          { id: 'w_b1_1', start: {x:0, y:-14}, end: {x:12, y:-14}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o_win_b1', type: 'window', position: 0.5, width: 4, properties: { sillHeight: 3, height: 4 } }] },
          { id: 'w_b1_2', start: {x:12, y:-14}, end: {x:12, y:0}, type: 'interior', thickness: 0.33, openings: [] },
          { id: 'w_b1_3', start: {x:12, y:0}, end: {x:0, y:0}, type: 'interior', thickness: 0.33, openings: [{ id: 'o_door_b1', type: 'door', position: 0.6, width: 2.8, properties: { swing: 'right', height: 6.67 } }] },
          { id: 'w_b1_4', start: {x:0, y:0}, end: {x:0, y:-14}, type: 'exterior', thickness: 0.5, openings: [] },
        ]
      },
      {
        id: 'r_bed2', label: 'Bedroom 2', type: 'bedroom',
        vertices: [{x:12,y:-14}, {x:24,y:-14}, {x:24,y:0}, {x:12,y:0}],
        x: 12, y: -14, width: 12, length: 14, name: 'Bedroom 2',
        fixtures: [
          { id: 'f_bed2', type: 'bed', position: {x:2, y:2}, x: 2, y: 2, width: 5, depth: 6.5, rotation: 0 },
        ],
        walls: [
          { id: 'w_b2_1', start: {x:12, y:-14}, end: {x:24, y:-14}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o_win_b2', type: 'window', position: 0.5, width: 4, properties: { sillHeight: 3, height: 4 } }] },
          { id: 'w_b2_2', start: {x:24, y:-14}, end: {x:24, y:0}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_b2_3', start: {x:24, y:0}, end: {x:12, y:0}, type: 'interior', thickness: 0.33, openings: [{ id: 'o_door_b2', type: 'door', position: 0.4, width: 2.8, properties: { swing: 'left', height: 6.67 } }] },
          { id: 'w_b2_4', start: {x:12, y:0}, end: {x:12, y:-14}, type: 'interior', thickness: 0.33, openings: [] },
        ]
      },
      {
        id: 'r_bath2', label: 'Bathroom', type: 'bathroom',
        vertices: [{x:0,y:-22}, {x:10,y:-22}, {x:10,y:-14}, {x:0,y:-14}],
        x: 0, y: -22, width: 10, length: 8, name: 'Bathroom',
        fixtures: [
          { id: 'f_t2', type: 'toilet', position: {x:1, y:1}, x: 1, y: 1, width: 1.5, depth: 2.2, rotation: 0 },
          { id: 'f_s2', type: 'sink', position: {x:4, y:0.5}, x: 4, y: 0.5, width: 2.5, depth: 2, rotation: 0 },
          { id: 'f_sh2', type: 'shower', position: {x:7, y:1}, x: 7, y: 1, width: 3, depth: 3, rotation: 0 },
        ],
        walls: [
          { id: 'w_bth2_1', start: {x:0, y:-22}, end: {x:10, y:-22}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_bth2_2', start: {x:10, y:-22}, end: {x:10, y:-14}, type: 'interior', thickness: 0.33, openings: [] },
          { id: 'w_bth2_3', start: {x:10, y:-14}, end: {x:0, y:-14}, type: 'interior', thickness: 0.33, openings: [{ id: 'o_door_bth2', type: 'door', position: 0.5, width: 2.5, properties: { swing: 'right', height: 6.67 } }] },
          { id: 'w_bth2_4', start: {x:0, y:-14}, end: {x:0, y:-22}, type: 'exterior', thickness: 0.5, openings: [] },
        ]
      }
    ]
  };
}

export function getLShapedPlan(): PlanJSON {
  return {
    metadata: { total_sqft: 750, floors: 1, bedrooms: 1, bathrooms: 1 },
    rooms: [
      {
        id: 'r_main', label: 'Living / Dining', type: 'living',
        vertices: [{x:0,y:0}, {x:20,y:0}, {x:20,y:14}, {x:12,y:14}, {x:12,y:22}, {x:0,y:22}],
        x: 0, y: 0, width: 20, length: 22, name: 'Living / Dining',
        fixtures: [
          { id: 'f_sofa_l', type: 'sofa', position: {x:1, y:1}, x: 1, y: 1, width: 7, depth: 3, rotation: 0 },
          { id: 'f_table_l', type: 'table', position: {x:2, y:15}, x: 2, y: 15, width: 5, depth: 3, rotation: 0 },
        ],
        walls: [
          { id: 'w_m1', start: {x:0, y:0}, end: {x:20, y:0}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o_win_m1', type: 'window', position: 0.3, width: 5, properties: { sillHeight: 3, height: 4 } }] },
          { id: 'w_m2', start: {x:20, y:0}, end: {x:20, y:14}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_m3', start: {x:20, y:14}, end: {x:12, y:14}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_m4', start: {x:12, y:14}, end: {x:12, y:22}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_m5', start: {x:12, y:22}, end: {x:0, y:22}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o_door_m', type: 'door', position: 0.5, width: 3, properties: { swing: 'left', height: 6.67 } }] },
          { id: 'w_m6', start: {x:0, y:22}, end: {x:0, y:0}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o_win_m2', type: 'window', position: 0.5, width: 4, properties: { sillHeight: 3, height: 4 } }] },
        ]
      },
      {
        id: 'r_bed_l', label: 'Bedroom', type: 'bedroom',
        vertices: [{x:12,y:14}, {x:26,y:14}, {x:26,y:28}, {x:12,y:28}],
        x: 12, y: 14, width: 14, length: 14, name: 'Bedroom',
        fixtures: [
          { id: 'f_bed_l', type: 'bed', position: {x:2, y:2}, x: 2, y: 2, width: 5, depth: 6.5, rotation: 0 },
        ],
        walls: [
          { id: 'w_bl1', start: {x:12, y:14}, end: {x:26, y:14}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_bl2', start: {x:26, y:14}, end: {x:26, y:28}, type: 'exterior', thickness: 0.5, openings: [{ id: 'o_win_bl', type: 'window', position: 0.5, width: 4, properties: { sillHeight: 3, height: 4 } }] },
          { id: 'w_bl3', start: {x:26, y:28}, end: {x:12, y:28}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_bl4', start: {x:12, y:28}, end: {x:12, y:14}, type: 'interior', thickness: 0.33, openings: [{ id: 'o_door_bl', type: 'door', position: 0.5, width: 2.8, properties: { swing: 'right', height: 6.67 } }] },
        ]
      },
      {
        id: 'r_bath_l', label: 'Bathroom', type: 'bathroom',
        vertices: [{x:0,y:22}, {x:8,y:22}, {x:8,y:30}, {x:0,y:30}],
        x: 0, y: 22, width: 8, length: 8, name: 'Bathroom',
        fixtures: [
          { id: 'f_tl', type: 'toilet', position: {x:1, y:1}, x: 1, y: 1, width: 1.5, depth: 2.2, rotation: 0 },
          { id: 'f_sl', type: 'sink', position: {x:4, y:0.5}, x: 4, y: 0.5, width: 2.5, depth: 2, rotation: 0 },
          { id: 'f_btl', type: 'bathtub', position: {x:1, y:4}, x: 1, y: 4, width: 4, depth: 2.5, rotation: 0 },
        ],
        walls: [
          { id: 'w_bthl1', start: {x:0, y:22}, end: {x:8, y:22}, type: 'interior', thickness: 0.33, openings: [{ id: 'o_door_bthl', type: 'door', position: 0.5, width: 2.5, properties: { swing: 'right', height: 6.67 } }] },
          { id: 'w_bthl2', start: {x:8, y:22}, end: {x:8, y:30}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_bthl3', start: {x:8, y:30}, end: {x:0, y:30}, type: 'exterior', thickness: 0.5, openings: [] },
          { id: 'w_bthl4', start: {x:0, y:30}, end: {x:0, y:22}, type: 'exterior', thickness: 0.5, openings: [] },
        ]
      }
    ]
  };
}

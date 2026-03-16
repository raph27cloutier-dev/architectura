'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PlanJSON, Wall } from '../types/plan';

const WALL_MATERIAL_COLOR = '#c4b49a';
const FLOOR_MATERIAL_COLOR = '#8b6f47';

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

interface WallMeshProps {
  wall: Wall;
  isExterior: boolean;
}

function WallMesh({ wall, isExterior }: WallMeshProps) {
  const start = Array.isArray(wall.start)
    ? { x: (wall.start as unknown as number[])[0], y: (wall.start as unknown as number[])[1] }
    : wall.start as { x: number; y: number };
  const end = Array.isArray(wall.end)
    ? { x: (wall.end as unknown as number[])[0], y: (wall.end as unknown as number[])[1] }
    : wall.end as { x: number; y: number };

  const len = distance(start, end);
  const height = isExterior ? 9 : 8;
  const thickness = wall.thickness || 0.33;

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  return (
    <mesh
      position={[midX, height / 2, midY]}
      rotation={[0, -angle, 0]}
    >
      <boxGeometry args={[len, height, thickness]} />
      <meshLambertMaterial color={WALL_MATERIAL_COLOR} />
    </mesh>
  );
}

interface FloorMeshProps {
  vertices: { x: number; y: number }[];
}

function FloorMesh({ vertices }: FloorMeshProps) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (vertices.length < 3) return s;
    s.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      s.lineTo(vertices[i].x, vertices[i].y);
    }
    s.closePath();
    return s;
  }, [vertices]);

  const geometry = useMemo(() => new THREE.ShapeGeometry(shape), [shape]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
    >
      <meshLambertMaterial color={FLOOR_MATERIAL_COLOR} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface View3DProps {
  plan: PlanJSON | null;
}

export const View3D = ({ plan }: View3DProps) => {
  if (!plan) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1612' }}>
        <p style={{ fontFamily: 'Instrument Sans, sans-serif', color: '#8c7b6a', fontSize: 14 }}>
          No plan loaded — describe a space or load a preset to see the 3D view.
        </p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [30, 25, 30], fov: 50 }}
      style={{ background: '#1a1612', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 30, 20]} intensity={0.9} castShadow />
      <directionalLight position={[-10, 15, -10]} intensity={0.3} />

      {plan.rooms.map(room => (
        <React.Fragment key={room.id}>
          {room.vertices && room.vertices.length >= 3 && (
            <FloorMesh vertices={room.vertices} />
          )}
          {room.walls.map(wall => (
            <WallMesh
              key={wall.id}
              wall={wall}
              isExterior={wall.type === 'exterior'}
            />
          ))}
        </React.Fragment>
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={120}
      />
    </Canvas>
  );
};

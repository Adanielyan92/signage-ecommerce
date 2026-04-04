"use client";

interface BackgroundPanelProps {
  width: number;
  height: number;
  depth: number;
}

export function BackgroundPanel({ width, height, depth }: BackgroundPanelProps) {
  const padding = 3;

  return (
    <mesh position={[0, height / 2, -(depth + 1)]} receiveShadow>
      <boxGeometry args={[width + padding * 2, height + padding * 2, 0.5]} />
      <meshStandardMaterial
        color="#e0e0e0"
        metalness={0.1}
        roughness={0.8}
      />
    </mesh>
  );
}

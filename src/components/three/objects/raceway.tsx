"use client";

interface RacewayProps {
  width: number;    // total sign width in inches
  height: number;   // sign height for vertical positioning
  depth: number;    // sign depth in inches
}

export function Raceway({ width, height, depth }: RacewayProps) {
  const racewayHeight = 3;
  const racewayDepth = Math.min(depth, 4);

  return (
    <mesh position={[0, -racewayHeight / 2 - 1, -racewayDepth / 2]}>
      <boxGeometry args={[width + 4, racewayHeight, racewayDepth]} />
      <meshStandardMaterial
        color="#808080"
        metalness={0.85}
        roughness={0.3}
      />
    </mesh>
  );
}

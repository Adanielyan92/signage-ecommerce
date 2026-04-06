"use client";

interface RacewayProps {
  width: number;    // total sign width in inches
  height: number;   // sign height for vertical positioning
  depth: number;    // sign depth in inches
}

/**
 * Linear raceway: a rectangular aluminum channel mounted directly BELOW
 * the letters, running the full width of the sign text. Letters mount on
 * top of the raceway. Height ~2.5", depth ~3".
 */
export function Raceway({ width, depth }: RacewayProps) {
  const racewayHeight = 2.5;
  const racewayDepth = Math.min(depth, 3);

  return (
    <mesh
      position={[0, -(racewayHeight / 2) - 0.5, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width + 4, racewayHeight, racewayDepth]} />
      <meshStandardMaterial
        color="#808080"
        metalness={0.85}
        roughness={0.3}
      />
    </mesh>
  );
}

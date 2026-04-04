"use client";

interface RacewayBoxProps {
  width: number;
  height: number;
  depth: number;
}

export function RacewayBox({ width, height, depth }: RacewayBoxProps) {
  const boxDepth = Math.min(depth + 1, 6);
  const padding = 2;

  return (
    <mesh position={[0, height / 2, -(boxDepth / 2 + 0.5)]} castShadow receiveShadow>
      <boxGeometry args={[width + padding * 2, height + padding * 2, boxDepth]} />
      <meshStandardMaterial
        color="#707070"
        metalness={0.8}
        roughness={0.35}
      />
    </mesh>
  );
}

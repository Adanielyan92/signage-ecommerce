"use client";

interface MountingStudsProps {
  letterPositions: { x: number; width: number }[];
  height: number;
  depth: number;
  xOffset: number;
}

export function MountingStuds({ letterPositions, height, depth, xOffset }: MountingStudsProps) {
  const studRadius = 0.15;
  const studLength = 1.2;

  return (
    <group>
      {letterPositions.map((lp, i) => (
        <group key={`studs-${i}`}>
          {/* Top stud */}
          <mesh
            position={[lp.x + xOffset + lp.width / 2, height * 0.75, -(depth + studLength / 2)]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[studRadius, studRadius, studLength, 6]} />
            <meshStandardMaterial color="#b0b0b0" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Bottom stud */}
          <mesh
            position={[lp.x + xOffset + lp.width / 2, height * 0.25, -(depth + studLength / 2)]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[studRadius, studRadius, studLength, 6]} />
            <meshStandardMaterial color="#b0b0b0" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

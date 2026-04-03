"use client";

/**
 * A flat plane mesh representing a person 5'8" (68 inches = ~5.67 feet) tall.
 * Used as a scale reference in the wall mockup scene.
 * Width is approximately 1.5 feet.
 * Positioned at the bottom-left of the wall.
 */

interface HumanSilhouetteProps {
  /** X position (left side of wall) */
  positionX: number;
  /** Y position (bottom of wall) */
  wallBottomY: number;
}

const HUMAN_HEIGHT_FT = 68 / 12; // 5.67 feet
const HUMAN_WIDTH_FT = 1.5;

export function HumanSilhouette({
  positionX,
  wallBottomY,
}: HumanSilhouetteProps) {
  // The silhouette stands at the bottom of the wall, centered on its height
  const y = wallBottomY + HUMAN_HEIGHT_FT / 2;

  return (
    <mesh position={[positionX, y, 0.02]}>
      <planeGeometry args={[HUMAN_WIDTH_FT, HUMAN_HEIGHT_FT]} />
      <meshStandardMaterial
        color="#333333"
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </mesh>
  );
}

"use client";

/**
 * A rectangle representing a standard door: 3 feet wide x 7 feet tall.
 * Used as a scale reference in the wall mockup scene.
 * Positioned at the bottom-right of the wall.
 */

interface DoorReferenceProps {
  /** X position (right side of wall) */
  positionX: number;
  /** Y position (bottom of wall) */
  wallBottomY: number;
}

const DOOR_WIDTH_FT = 3;
const DOOR_HEIGHT_FT = 7;
const FRAME_THICKNESS = 0.08; // visual thickness for the door outline in feet

export function DoorReference({ positionX, wallBottomY }: DoorReferenceProps) {
  const y = wallBottomY + DOOR_HEIGHT_FT / 2;

  return (
    <group position={[positionX, y, 0.02]}>
      {/* Door fill - lighter interior */}
      <mesh>
        <planeGeometry args={[DOOR_WIDTH_FT, DOOR_HEIGHT_FT]} />
        <meshStandardMaterial
          color="#8B7355"
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>

      {/* Door frame - darker outline using four thin rectangles */}
      {/* Top */}
      <mesh position={[0, DOOR_HEIGHT_FT / 2 - FRAME_THICKNESS / 2, 0.001]}>
        <planeGeometry args={[DOOR_WIDTH_FT, FRAME_THICKNESS]} />
        <meshStandardMaterial color="#3E2723" depthWrite={false} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -DOOR_HEIGHT_FT / 2 + FRAME_THICKNESS / 2, 0.001]}>
        <planeGeometry args={[DOOR_WIDTH_FT, FRAME_THICKNESS]} />
        <meshStandardMaterial color="#3E2723" depthWrite={false} />
      </mesh>
      {/* Left */}
      <mesh position={[-DOOR_WIDTH_FT / 2 + FRAME_THICKNESS / 2, 0, 0.001]}>
        <planeGeometry args={[FRAME_THICKNESS, DOOR_HEIGHT_FT]} />
        <meshStandardMaterial color="#3E2723" depthWrite={false} />
      </mesh>
      {/* Right */}
      <mesh position={[DOOR_WIDTH_FT / 2 - FRAME_THICKNESS / 2, 0, 0.001]}>
        <planeGeometry args={[FRAME_THICKNESS, DOOR_HEIGHT_FT]} />
        <meshStandardMaterial color="#3E2723" depthWrite={false} />
      </mesh>

      {/* Door handle */}
      <mesh position={[DOOR_WIDTH_FT / 2 - 0.4, -0.3, 0.002]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#B8860B" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

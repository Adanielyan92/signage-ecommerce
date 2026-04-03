"use client";

import * as THREE from "three";
import { useMemo } from "react";

interface SignPostRendererProps {
  postType: string; // single-post, double-post, monument-base
  postHeight: number;
  signWidth: number;
  signHeight: number;
  doubleSided: boolean;
}

const POST_RADIUS = 1.5; // inches radius for cylindrical posts
const POST_RECT_WIDTH = 2.5; // inches for rectangular post cross-section
const POST_RECT_DEPTH = 2.5;
const MONUMENT_WIDTH_PAD = 4; // extra width beyond sign on each side

/**
 * Sign post renderer with posts/base and a sign panel mounted on top.
 * Supports single post, double post, and monument (wide rectangular base) styles.
 */
export function SignPostRenderer({
  postType,
  postHeight,
  signWidth,
  signHeight,
  doubleSided,
}: SignPostRendererProps) {
  const postMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#606060",
        metalness: 0.85,
        roughness: 0.3,
      }),
    []
  );

  const signPanelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f0f0f0",
        metalness: 0.1,
        roughness: 0.4,
      }),
    []
  );

  const signEdgeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#808080",
        metalness: 0.7,
        roughness: 0.35,
      }),
    []
  );

  const monumentMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#505050",
        metalness: 0.6,
        roughness: 0.5,
      }),
    []
  );

  // Sign panel sits on top of posts
  const signCenterY = postHeight + signHeight / 2;
  const panelThickness = 0.5;

  const isMonument = postType === "monument-base";
  const isDoublePost = postType === "double-post";

  return (
    <group>
      {/* Posts */}
      {isMonument ? (
        // Monument base: wide rectangular column
        <mesh position={[0, postHeight / 2, 0]}>
          <boxGeometry
            args={[
              signWidth + MONUMENT_WIDTH_PAD * 2,
              postHeight,
              POST_RECT_DEPTH * 2,
            ]}
          />
          <primitive object={monumentMaterial} attach="material" />
        </mesh>
      ) : isDoublePost ? (
        // Double posts: two cylindrical posts spaced apart
        <>
          <mesh position={[-(signWidth / 2 - POST_RADIUS * 2), postHeight / 2, 0]}>
            <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, postHeight, 16]} />
            <primitive object={postMaterial} attach="material" />
          </mesh>
          <mesh position={[(signWidth / 2 - POST_RADIUS * 2), postHeight / 2, 0]}>
            <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, postHeight, 16]} />
            <primitive object={postMaterial} attach="material" />
          </mesh>
        </>
      ) : (
        // Single post: one cylindrical post centered
        <mesh position={[0, postHeight / 2, 0]}>
          <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, postHeight, 16]} />
          <primitive object={postMaterial} attach="material" />
        </mesh>
      )}

      {/* Sign panel frame (edge) */}
      <mesh position={[0, signCenterY, 0]}>
        <boxGeometry args={[signWidth, signHeight, panelThickness]} />
        <primitive object={signEdgeMaterial} attach="material" />
      </mesh>

      {/* Front sign face */}
      <mesh position={[0, signCenterY, panelThickness / 2 + 0.01]}>
        <planeGeometry args={[signWidth - 0.3, signHeight - 0.3]} />
        <primitive object={signPanelMaterial} attach="material" />
      </mesh>

      {/* Back sign face (if double-sided) */}
      {doubleSided && (
        <mesh
          position={[0, signCenterY, -(panelThickness / 2 + 0.01)]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[signWidth - 0.3, signHeight - 0.3]} />
          <primitive object={signPanelMaterial} attach="material" />
        </mesh>
      )}

      {/* Ground plane indicator */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry
          args={[
            isMonument ? signWidth + MONUMENT_WIDTH_PAD * 2 + 4 : signWidth + 8,
            POST_RECT_DEPTH * 4,
          ]}
        />
        <meshStandardMaterial
          color="#4a5c3a"
          roughness={0.95}
          metalness={0}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

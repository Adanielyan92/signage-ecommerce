import type { Object3D } from "three";

/** Shared ref for the sign group, written by the 3D scene, read by AR export. */
let signGroupRef: Object3D | null = null;

export function setSignGroupRef(obj: Object3D | null) {
  signGroupRef = obj;
}

export function getSignGroupRef(): Object3D | null {
  return signGroupRef;
}

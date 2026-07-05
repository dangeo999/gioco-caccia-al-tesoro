"use client";

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ScannedAsset } from "./worldAssets";

/** Renderizza un mondo GLB scansionato.
 *  - `emissiveBoost` (0..1): usa la texture come auto-illuminazione così i colori
 *    delle FACCIATE (materiali con texture) restano vivi anche in scena buia,
 *    senza toccare strada e lastre nere (che non hanno texture).
 *  - `clipBackdropY`: taglia le lastre nere di backdrop (materiale "wall_backdrop")
 *    appena sopra il tetto, così non svettano nel cielo.
 *  - `softBackdrop`: rende i muri di backdrop maschere di sola profondità (invisibili)
 *    così occludono lo scan sporco senza svettare come lastre. I varchi che restano
 *    si coprono con il fumo (vedi GapSmoke in ExteriorBar). */
export default function ScannedWorld({
  asset,
  emissiveBoost = 0,
  clipBackdropY,
  softBackdrop = false,
}: {
  asset: ScannedAsset;
  emissiveBoost?: number;
  clipBackdropY?: number;
  softBackdrop?: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const { scene } = useGLTF(asset.url);
  const clone = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((node) => {
      if ("isMesh" in node && node.isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((mat) => mat.clone())
          : mesh.material.clone();
      }
    });
    return cloned;
  }, [scene]);

  useEffect(() => {
    const clip =
      clipBackdropY != null
        ? new THREE.Plane(new THREE.Vector3(0, -1, 0), clipBackdropY)
        : null;
    if (clip) gl.localClippingEnabled = true;
    clone.traverse((node) => {
      if ("isMesh" in node && node.isMesh) {
        const mesh = node as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const isBackdropMesh =
          softBackdrop &&
          (mesh.name.startsWith("blocking_walls_mesh") ||
            mats.some((mat) => mat.name === "wall_backdrop"));

        if (isBackdropMesh) {
          // Muri di backdrop: maschera di sola profondità (invisibili) → occludono
          // lo scan sporco senza svettare. I varchi si coprono col fumo (GapSmoke).
          const depthMask = new THREE.MeshBasicMaterial({
            name: "wall_backdrop_depth_mask",
            colorWrite: false,
            depthWrite: true,
            depthTest: true,
            side: THREE.DoubleSide,
          });
          if (clip) depthMask.clippingPlanes = [clip];
          mesh.material = depthMask;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.renderOrder = -10;
          return;
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        for (const mat of mats) {
          const sm = mat as THREE.MeshStandardMaterial;
          if (!sm || !("emissive" in sm)) continue;
          // Colori accesi solo dove c'è una texture (facciate): strada e lastre
          // nere restano scure come prima.
          if (emissiveBoost > 0 && sm.map) {
            sm.emissiveMap = sm.map;
            sm.emissive.setRGB(1, 1, 1);
            sm.emissiveIntensity = emissiveBoost;
            sm.needsUpdate = true;
          }
          // Taglio netto delle lastre di backdrop appena sopra il tetto.
          if (clip && sm.name === "wall_backdrop") {
            sm.clippingPlanes = [clip];
            sm.needsUpdate = true;
          }
        }
      }
    });
  }, [clone, emissiveBoost, clipBackdropY, softBackdrop, gl]);

  const scale = typeof asset.scale === "number"
    ? [asset.scale, asset.scale, asset.scale] as [number, number, number]
    : asset.scale ?? [1, 1, 1];

  return (
    <primitive
      object={clone}
      position={asset.position ?? [0, 0, 0]}
      rotation={asset.rotation ?? [0, 0, 0]}
      scale={scale}
    />
  );
}

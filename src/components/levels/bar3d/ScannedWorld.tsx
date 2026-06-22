"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import type { ScannedAsset } from "./worldAssets";

/** Renderizza un mondo GLB esterno mantenendo luci, controlli e hotspot separati. */
export default function ScannedWorld({ asset }: { asset: ScannedAsset }) {
  const { scene } = useGLTF(asset.url);
  const clone = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    clone.traverse((node) => {
      if ("isMesh" in node && node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
  }, [clone]);

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

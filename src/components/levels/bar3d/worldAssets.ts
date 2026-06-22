/** Configurazione unica degli asset 3D del Port Royal.
 *
 * Quando avremo le esportazioni Marble:
 * 1. copiare i GLB in public/levels/bar/models/
 * 2. valorizzare `visual` per esterno e interno
 * 3. regolare scala/posizione senza toccare le meccaniche del livello.
 */
export type ScannedAsset = {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
};

export type WorldAssetSlot = {
  visual: ScannedAsset | null;
  /** Riservato alla Collider Mesh (GLB) esportata da Marble. */
  colliderUrl: string | null;
  entryPoint: {
    position: [number, number, number];
    size: [number, number, number];
  } | null;
};

export const BAR_WORLD_ASSETS: {
  exterior: WorldAssetSlot;
  interior: WorldAssetSlot;
} = {
  exterior: {
    visual: null,
    colliderUrl: null,
    entryPoint: {
      position: [-4.25, 1.15, -6.13],
      size: [1.65, 2.3, 0.18],
    },
  },
  interior: {
    visual: null,
    colliderUrl: null,
    entryPoint: null,
  },
};

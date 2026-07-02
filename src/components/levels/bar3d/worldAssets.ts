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
    visual: {
      url: "/levels/bar/models/02_strada_edifici.glb",
      position: [0, 0.3, 0],
      rotation: [0, 0, 0],
      scale: 0.18,
    },
    colliderUrl: null,
    // Ingresso Port Royal: bar ext a game x[1.3..6.5], fronte strada z≈-1.25.
    entryPoint: {
      position: [3.9, 1.0, -1.15],
      size: [3.6, 2.4, 0.9],
    },
  },
  interior: {
    // Scan "bar vano sx" + "bar vano dx" esportati da Blender (04_bar_interno.glb).
    // World bounds Blender: X[10.23,60.03] Y[27.83,56.34] Z(alt)[0.03,17.74].
    // Con yup nel GLB: X→X, Zalt→Y, -Y→Z. Scala 0.18 → stanza ~9×5×3.2 m.
    // position centra il modello sull'origine (pavimento a y=0); rifinire a occhio.
    visual: {
      url: "/levels/bar/models/04_bar_interno.glb",
      position: [-6.32, 0, 7.57],
      rotation: [0, 0, 0],
      scale: 0.18,
    },
    colliderUrl: null,
    entryPoint: null,
  },
};

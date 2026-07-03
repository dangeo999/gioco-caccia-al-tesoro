GLB Marble per il livello Port Royal
====================================

Metti qui gli export Marble separati, senza usare Studio Compose.

Nomi consigliati:

- 01_strada_incrocio.glb
- 02_strada_avanti.glb
- 03_port_royal_ingresso.glb
- 04_port_royal_interno.glb

Dopo aver copiato i file, configura posizione, rotazione e scala in:

src/components/levels/bar3d/worldAssets.ts

Esempio:

{
  id: "strada-01",
  url: "/levels/bar/models/01_strada_incrocio.glb",
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
}

Note:

- Non serve che i GLB siano fusi in un unico file.
- Le giunzioni brutte si nascondono meglio con porte, curve, trigger e hotspot.
- Se un pezzo e' troppo grande/piccolo, cambia `scale`.
- Se un pezzo guarda nella direzione sbagliata, cambia `rotation[1]`.

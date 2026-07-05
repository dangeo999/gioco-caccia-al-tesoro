Modelli runtime del Port Royal
==============================

Questa cartella deve contenere solo i GLB caricati dal gioco:

- 02_strada_edifici.glb
- 04_bar_interno.glb

Il codice li configura in:

src/components/levels/bar3d/worldAssets.ts

Per il deploy pubblico e' consigliato spostarli su storage/CDN e impostare:

NEXT_PUBLIC_BAR_MODEL_BASE_URL=https://.../levels/bar/models

La URL non deve terminare con slash. Se la variabile non e' impostata, il gioco
usa il fallback locale /levels/bar/models.

Gli export sorgente, SPZ, collider e backup non devono stare in public: gonfiano
il deploy e rischiano di superare i limiti dello hosting.

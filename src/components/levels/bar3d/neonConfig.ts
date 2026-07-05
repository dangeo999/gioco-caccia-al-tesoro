// Config dell'insegna al neon del Cap. 1, condivisa tra la modale 2D
// (BarPortRoyal) e l'insegna 3D sulla parete (FirstPersonBar), così le due
// rappresentazioni non vanno mai in disaccordo: stessa parola, stesse lettere
// fulminate, stesso conteggio di lettere accese → prima cifra del codice.
//
//   indici parola:  P0 O1 R2 T3 R4 O5 Y6 A7 L8
//   fulminate {1,5,7} = O, O, A  →  restano ACCESE 6 lettere (P R T R Y L)
export const NEON_WORD = "PORTROYAL";
export const NEON_OFF = new Set([1, 5, 7]);
/** Come va mostrata a schermo: maiuscole/minuscole come l'insegna reale. */
export const NEON_DISPLAY = "Port Royal";

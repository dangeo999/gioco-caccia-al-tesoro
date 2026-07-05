# Attivazione backend Supabase

Il frontend è già configurato localmente tramite `.env.local`. Per attivare il
backend servono due operazioni nel Dashboard Supabase.

## 1. Accesso anonimo

1. Aprire **Authentication → Providers**.
2. Aprire **Anonymous Sign-Ins**.
3. Abilitare il provider e salvare.
4. Prima del lancio pubblico, abilitare anche CAPTCHA/Turnstile e rate limiting.

## 2. Schema database

1. Aprire **SQL Editor → New query**.
2. Copiare tutto il contenuto di
   `migrations/202606220001_secure_game_backend.sql`.
3. Eseguire la query una sola volta.
4. Ripetere con `migrations/202606230001_rate_limit_solutions.sql`: aggiunge il
   lockout anti brute-force su `complete_chapter` (5 tentativi errati per
   capitolo → blocco di 5 minuti).

La migrazione crea tabelle, RLS e RPC per:

- profili pseudonimi e dispositivi;
- progressi e coin server-side;
- riscatti QR tracciati;
- Pass Argil monouso;
- squadre future.

## 3. Produzione

Su Vercel impostare:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## 4. Storage modelli 3D

Per non gonfiare i deploy, i GLB pesanti del bar possono stare in Supabase
Storage o in un CDN pubblico equivalente.

Percorso consigliato nel bucket pubblico `pofi-game`:

```text
levels/bar/models/02_strada_edifici.glb
levels/bar/models/04_bar_interno.glb
```

Su Vercel impostare anche:

```text
NEXT_PUBLIC_BAR_MODEL_BASE_URL=https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/pofi-game/levels/bar/models
```

La URL non deve terminare con slash. Se la variabile non e' impostata, il gioco
usa i file locali in `public/levels/bar/models`.

La chiave `SUPABASE_SERVICE_ROLE_KEY`, se verrà usata dalle API admin, deve
esistere solo nelle variabili server di Vercel. Non va mai committata, mostrata
nel browser o condivisa in chat.

## Stato nell'app

- `cloud ✓`: sessione e database attivi;
- `cloud …`: connessione in corso;
- `offline`: localStorage attivo, backend non disponibile.

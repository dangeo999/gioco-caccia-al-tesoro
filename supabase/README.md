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

La chiave `SUPABASE_SERVICE_ROLE_KEY`, se verrà usata dalle API admin, deve
esistere solo nelle variabili server di Vercel. Non va mai committata, mostrata
nel browser o condivisa in chat.

## Stato nell'app

- `cloud ✓`: sessione e database attivi;
- `cloud …`: connessione in corso;
- `offline`: localStorage attivo, backend non disponibile.

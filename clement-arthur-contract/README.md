# Hub — Classement

Implémentation full stack du contrat [`atelier1_retro-contrat_team-lisnard.yaml`](../atelier1_retro-contrat_team-lisnard.yaml) :
un seul endpoint, `GET /api/v1/classement`, et une seule page.

```
backend/    API Express (Node ≥ 20) — tri, rangs, pagination, JWT, rate limiting, erreurs ApiError
frontend/   Page Vite (JS natif) — mobile d'abord, tableau complet en plein écran
```

## Lancer

```bash
npm install
npm run dev
```

- Front : http://localhost:5173
- API : http://localhost:3000/api/v1/classement (proxifiée par Vite sous `/api`)

`npm run dev` émet d'abord un JWT de développement (`npm run token`) et l'écrit dans
`frontend/.env.local` (`VITE_PLAYER_TOKEN`) : le Front l'envoie en `Authorization: Bearer <token>`.
Le contrat ne définit pas d'endpoint de connexion, d'où ce jeton émis localement.

## Tests

```bash
npm test
```

Vérifie les réponses 200 / 400 / 401 / 429, l'ordre des champs, le départage des égalités
(Dylan 99ᵉ, Dylan_Test 100ᵉ) et la pagination (dernière page partielle, page hors limites,
pages consécutives sans trou ni doublon).

## Données d'exemple

100 joueurs en mémoire (`backend/src/data/joueurs.js`) : 11 écrits à la main, 89 générés par un
PRNG à graine fixe (mêmes valeurs à chaque démarrage). Les XP sont des multiples de 5 pour créer des
égalités, et environ un tiers des joueurs n'a pas d'équipe. Avec la limite par défaut (20), cela fait 5 pages.

## Ce que le contrat impose, et où

| Règle du contrat | Implémentation |
| --- | --- |
| Tri XP décroissant, départage par date d'obtention | `backend/src/classement.js` |
| Rangs stricts et continus | `classer()` — `rang = index + 1` |
| `equipe` toujours présent, `null` sans équipe → Front affiche « — » | `frontend/src/main.js` `createRow()` |
| Top 3 doré (`rang <= 3`) côté Front | classe `.is-top` |
| Erreurs au format unique `{ code, message }` | `backend/src/errors.js`, `frontend/src/api.js` |
| `periode` obligatoire, `page ≥ 1`, `1 ≤ limite ≤ 100` | `backend/src/routes/classement.js` |
| Pagination : bouton suivant désactivé, nombre de pages | `frontend/src/main.js` `renderPager()` |

## Ce que le contrat ne précise pas (choix minimaux)

Le Front n'ajoute rien au contrat. Côté API, ces points sont imposés par l'implémentation mais
absents du contrat :

- « Aujourd'hui » est calculé sur le fuseau horaire du serveur.
- Une page au-delà de `totalPages` renvoie 200 avec `entrees: []`.
- 404 et 500 suivent le format ApiError (principe 5), codes `NOT_FOUND` et `INTERNAL_ERROR`.
- Rate limiting : 60 requêtes par minute et par IP, vérifié avant le jeton.
- Le jeton est vérifié avant les paramètres (sans jeton + période invalide → 401).

## Configuration (API)

| Variable | Défaut |
| --- | --- |
| `API_PORT` | `3000` |
| `JWT_SECRET` | `dev-secret-a-changer` |
| `RATE_LIMIT_MAX` | `60` requêtes |
| `RATE_LIMIT_WINDOW_MS` | `60000` ms |

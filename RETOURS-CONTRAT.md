# Retours sur le contrat « Hub — API Classement » (v1.0.0)

Fichier relu : `atelier1_retro-contrat_team-lisnard.yaml`

J'ai implémenté le contrat en entier (API + page, dans `clement-arthur-contract/`) et validé
315 réponses réelles de l'API contre les schémas du contrat. L'implémentation respecte tout ce
que le contrat dit. Ce document liste ce que le contrat **ne dit pas**, ou dit de façon
contradictoire : les endroits où deux équipes qui suivent le contrat à la lettre pourraient
produire des choses incompatibles.

Le contrat n'a pas été modifié. Les propositions ci-dessous sont des suggestions.

## Ce qui est bien

- Les décisions importantes sont tranchées et expliquées : tri imposé côté serveur, rangs sans
  ex æquo, `equipe` toujours présent (`null` sans équipe), doré du top 3 côté Front, format
  d'erreur unique.
- Les schémas sont précis : champs requis, `minimum`, `pattern` sur `joueurId`, `enum` sur
  `periode`.
- Les commentaires expliquent le *pourquoi*, pas seulement le *quoi*.

---

## 1. Bloquant

### 1.1 Le fichier n'est pas du YAML valide

**Lignes 75 et 219**

```yaml
description: Paramètre de requête invalide (ex: période inconnue, page négative).
description: Code d'erreur machine compréhensible (ex: INVALID_QUERY_PARAMETER, UNAUTHORIZED).
```

En YAML, `: ` (deux-points suivi d'un espace) est interdit dans une valeur sans guillemets.
Le fichier est donc refusé par Swagger UI, Swagger Editor, les générateurs de code et les
validateurs OpenAPI (erreur : *bad indentation of a mapping entry at line 75*).

**Proposition** : mettre ces deux valeurs entre guillemets.

```yaml
description: "Paramètre de requête invalide (ex: période inconnue, page négative)."
description: "Code d'erreur machine compréhensible (ex: INVALID_QUERY_PARAMETER, INVALID_TOKEN)."
```

---

## 2. Ambiguïtés (deux implémentations peuvent diverger)

### 2.1 « Aujourd'hui » n'a pas de fuseau horaire

**Lignes 37, 120** — `aujourd_hui` ne dit pas quand la journée commence. Minuit à Paris et
minuit UTC ne sont pas le même moment : entre 0 h et 2 h (heure d'été), le Front et le Back
peuvent ne pas parler du même jour.

**Proposition** : « `aujourd_hui` = XP gagnée depuis minuit, heure de Paris (Europe/Paris). »

*Dans mon implémentation : fuseau horaire du serveur.*

### 2.2 Le départage des égalités n'est pas complètement défini

**Lignes 11-12, 166** — « date d'obtention de l'XP » / `dateAtteinte` :

- `dateAtteinte` n'existe dans aucun schéma : on ne sait pas ce que c'est exactement.
- Pour un joueur à 0 XP (Dylan, Dylan_Test), quelle est la date « d'obtention » de 0 XP ?
  Création du compte ? Début de la saison ?
- Si deux joueurs ont la même XP **et** la même date, rien ne départage : l'ordre n'est plus
  garanti, alors que le contrat promet des rangs stricts.

**Proposition** : définir `dateAtteinte` (« horodatage du dernier gain d'XP sur la période ; à
défaut, date d'inscription ») et ajouter un dernier critère (« puis `joueurId` croissant »).

*Dans mon implémentation : XP décroissante puis `dateAtteinte` croissante, exactement comme
écrit, sans critère supplémentaire.*

### 2.3 Page au-delà de la dernière page

Que renvoie `?page=99` quand `totalPages` vaut 5 ? Une 400 ? Une 404 ? Une 200 avec une
liste vide ? Le contrat ne le dit pas.

**Proposition** : « Si `page > totalPages`, réponse 200 avec `entrees: []`. »

*Dans mon implémentation : 200 avec `entrees: []`.*

### 2.4 Qui est « classé » ?

**Ligne 150** — `totalElements` = « nombre total de joueurs classés pour cette période ». Un
joueur qui n'a gagné aucune XP aujourd'hui est-il classé dans `aujourd_hui` ? La réponse change
`totalElements`, `totalPages` et le rang de tout le monde en bas de tableau.

**Proposition** : « Tous les joueurs sont classés, y compris à 0 XP » (ou l'inverse), écrit
explicitement.

*Dans mon implémentation : tous les joueurs, y compris à 0 XP.*

### 2.5 Codes d'erreur incohérents

**Ligne 219 contre ligne 91** — la description de `ApiError.code` cite `UNAUTHORIZED` comme
exemple, mais la réponse 401 utilise `INVALID_TOKEN`. De plus, `code` est une chaîne libre :
le Front ne peut pas savoir quels codes existent, alors que le principe 5 vise justement un
intercepteur d'erreur générique.

**Proposition** : une `enum` sur `code`.

```yaml
code:
  type: string
  enum: [INVALID_QUERY_PARAMETER, INVALID_TOKEN, RATE_LIMITED, NOT_FOUND, INTERNAL_ERROR]
```

### 2.6 `limite` supérieure à 100 : refus ou plafonnement ?

**Ligne 59** — `maximum: 100` laisse penser qu'une `limite=150` donne une 400, mais la
description de la 400 (ligne 75) ne cite que « période inconnue, page négative ». Certaines
API plafonnent silencieusement à 100.

**Proposition** : citer les trois cas dans la 400 : période absente ou inconnue, `page < 1`
ou non entière, `limite` hors de 1-100 ou non entière.

*Dans mon implémentation : 400.*

---

## 3. Réponses manquantes

### 3.1 Pas de 500 (ni de 404)

**Ligne 15** — le principe 5 dit que **tous** les codes d'erreur ont le même format, mais
seuls 400, 401 et 429 sont documentés. Une erreur serveur est inévitable un jour : le Front
doit savoir qu'elle arrivera aussi au format `{ code, message }`.

**Proposition** : ajouter une réponse `"500"` (ou `default`) qui pointe vers `ApiError`.

*Dans mon implémentation : 404 `NOT_FOUND` et 500 `INTERNAL_ERROR` au format `ApiError`.*

### 3.2 La 429 ne dit pas quand réessayer

**Ligne 94** — pas d'en-tête `Retry-After`, et aucune limite indiquée (combien de requêtes ?
par minute ? par joueur ou par IP ?). Le message dit « réessayer plus tard » sans dire quand.

**Proposition** : documenter la limite et ajouter un en-tête `Retry-After` (en secondes) à la
réponse 429.

*Dans mon implémentation : 60 requêtes par minute et par IP, sans `Retry-After` (absent du
contrat).*

### 3.3 Ordre des vérifications

Une requête sans jeton **et** avec une période invalide : 401 ou 400 ? Pas indiqué.

*Dans mon implémentation : 401 (le jeton est vérifié en premier).*

---

## 4. Questions produit (à discuter, pas des erreurs)

- **Le jeton ne sert à rien d'autre qu'à authentifier** (ligne 24 : « identifier
  l'appelant »). La réponse ne signale pas le joueur connecté et ne donne pas son rang s'il
  n'est pas sur la page affichée, ce que font la plupart des classements.
- **Pagination par numéro de page sur des données qui bougent** : si un joueur gagne de l'XP
  entre le chargement de la page 1 et de la page 2, il peut apparaître deux fois ou pas du
  tout. Un champ `calculeLe` (date de calcul) permettrait au moins de le détecter.
- **`pseudo` n'a pas de longueur maximale** (ligne 184-186) : le Front doit deviner comment
  gérer un pseudo de 200 caractères. Un `maxLength` réglerait la question.
- **`niveau` en période `aujourd_hui`** (ligne 199) : l'XP est celle du jour, mais le niveau
  est sans doute le niveau global actuel. Une phrase suffirait à le préciser.
- **`equipe` : chaîne vide ou `null` ?** Un `minLength: 1` sur `equipe` garantirait que
  « pas d'équipe » s'écrit toujours `null`.

---

## 5. Cosmétique

- Pas de `servers`, `operationId` ni `tags` (utilisés par les générateurs de code et Swagger UI).
- L'exemple de message de `ApiError` (ligne 224, « La période demandée est invalide. ») ne
  correspond pas à celui de la 400 (ligne 82, « La période doit être 'saison' ou 'aujourd_hui'. »).

---

## En résumé

| Priorité | Points |
| --- | --- |
| À corriger avant tout | 1.1 (YAML invalide) |
| À trancher (risque d'incompatibilité Front/Back) | 2.1 à 2.6 |
| À compléter | 3.1 à 3.3 |
| À discuter | section 4 |
| Facultatif | section 5 |

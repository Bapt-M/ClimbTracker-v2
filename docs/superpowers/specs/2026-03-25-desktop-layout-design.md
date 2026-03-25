# Desktop Layout Design Spec

## Goal

Adapter ClimbTracker v2 pour les écrans desktop en conservant le style néo-brutaliste mobile, en ajoutant une top nav avec icônes+labels et des layouts 2 colonnes par page.

## Contexte

L'application est aujourd'hui entièrement mobile-first avec une contrainte `max-w-md` (428px) sur chaque page, une `BottomNav` fixe en bas, et aucun breakpoint responsive. Zéro shared Layout wrapper — chaque page est autonome.

Le stack frontend : React + Vite, Tailwind CSS, breakpoint `md` = 768px.

## Navigation

**Nouveau composant `TopNav.tsx`** — barre fixe en haut, full width, visible uniquement sur desktop (`hidden md:flex`).

Contenu : les 5 mêmes items que le `BottomNav` actuel (icônes Material Symbols + labels français), même logique d'état actif, même gestion des rôles (admin/premium/free).

Style : fond `bg-cream`, bordure basse `border-b-2 border-climb-dark`, hauteur fixe ~64px. Items centrés avec gap, actif = pill colorée (même pattern que BottomNav).

**`BottomNav.tsx`** : ajouter `md:hidden` pour se masquer sur desktop. Aucun autre changement.

**Import dans chaque page** : chaque page importe déjà `BottomNav` individuellement — ajouter de même `TopNav` au-dessus du contenu de chaque page protégée (même pattern, pas de Layout wrapper global).

## Contrainte de largeur

Sur mobile (< md) : comportement inchangé — `max-w-md mx-auto` conservé.

Sur desktop (≥ md) : `md:max-w-none` sur le container principal de chaque page pour lever la contrainte 428px. Le contenu s'étend en 2 colonnes.

## Layouts 2 colonnes par page

Chaque page utilise un `md:grid md:grid-cols-[...] md:gap-6` pour passer en 2 colonnes sur desktop. Les proportions varient selon le contenu.

### RoutesHub (`/routes`)
- **Gauche (md:w-72 fixe)** : panneau filtres/recherche (actuellement en haut de page, devient sidebar fixe)
- **Droite (flex-1)** : grille de cartes de blocs (passe en 2-3 colonnes avec `md:grid-cols-2 lg:grid-cols-3`)

### Dashboard (`/`)
- **Gauche (md:w-80)** : stats utilisateur + accès rapide (créer bloc, etc.)
- **Droite (flex-1)** : activité récente + blocs récents

### RouteDetail (`/routes/:id`)
- **Gauche (md:w-1/2)** : photo principale + infos du bloc (nom, difficulté, secteur, description, tips, hold detection)
- **Droite (md:w-1/2)** : validations, commentaires, boutons d'action (valider, analyser)

### Leaderboard (`/leaderboard`)
- **Gauche (flex-1)** : tableau de classement
- **Droite (md:w-80)** : profil de l'utilisateur sélectionné (click sur une ligne = affiche le profil)

### Friends (`/friends`)
- **Gauche (md:w-72)** : liste d'amis + recherche
- **Droite (flex-1)** : profil de l'ami sélectionné (click = affiche), placeholder si aucun sélectionné

### CreateRoute (`/routes/create`)
- **Gauche (md:w-1/2)** : formulaire complet
- **Droite (md:w-1/2)** : aperçu en temps réel (photo uploadée, couleur sélectionnée, hold overlay)

### UserProfile (`/users/:id`)
- **Gauche (md:w-80)** : avatar, stats, infos profil
- **Droite (flex-1)** : liste des blocs validés / activité

### Pages inchangées (formulaire pleine largeur centré)
- `Admin`, `Pricing`, `NotificationSettings`, `Login`, `Register`, `AnalyzeVideo`, `AnalysisResults`, `HoldDetection` — ces pages restent centrées avec une largeur max raisonnable (`md:max-w-2xl mx-auto`).

## Ce qui ne change pas

- Tout le style visuel : couleurs, ombres `shadow-neo`, bordures, fonts Lexend
- Comportement mobile : inchangé sous `md:`
- Logique métier, appels API, state management
- Animations et interactions (press, hover)

## Implémentation

### Fichiers créés
- `apps/web/src/components/TopNav.tsx` — nouveau composant navigation desktop

### Fichiers modifiés
- `apps/web/src/components/BottomNav.tsx` — ajouter `md:hidden`
- `apps/web/src/pages/Dashboard.tsx` — import TopNav + layout 2 colonnes
- `apps/web/src/pages/RoutesHub.tsx` — import TopNav + layout 2 colonnes
- `apps/web/src/pages/RouteDetail.tsx` — import TopNav + layout 2 colonnes
- `apps/web/src/pages/Leaderboard.tsx` — import TopNav + layout 2 colonnes
- `apps/web/src/pages/Friends.tsx` — import TopNav + layout 2 colonnes
- `apps/web/src/pages/CreateRoute.tsx` — import TopNav + layout 2 colonnes
- `apps/web/src/pages/UserProfile.tsx` — import TopNav + layout 2 colonnes
- Pages secondaires (Admin, Pricing, etc.) — import TopNav + `md:max-w-2xl mx-auto`

## Critères de succès

- Sur mobile : comportement identique à aujourd'hui
- Sur desktop (≥768px) : top nav visible, bottom nav masquée, layout 2 colonnes fonctionnel
- Style cohérent avec le mobile (pas de nouveaux design tokens)
- Pas de régression sur les fonctionnalités existantes

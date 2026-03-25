# Desktop Layout Design Spec

## Goal

Adapter ClimbTracker v2 pour les écrans desktop en conservant le style néo-brutaliste mobile, en ajoutant une top nav avec icônes+labels et des layouts 2 colonnes par page.

## Contexte

L'application est aujourd'hui entièrement mobile-first avec une contrainte `max-w-md` (428px) sur chaque page, une `BottomNav` fixe en bas, et aucun breakpoint responsive. Zéro shared Layout wrapper — chaque page est autonome.

Le stack frontend : React + Vite, Tailwind CSS, breakpoint `md` = 768px.

**Note importante :** `RouteDetail.tsx` et `CreateRoute.tsx` n'importent PAS `BottomNav` — elles ont leur propre navigation inline. `RouteDetail` a une barre d'action fixe en bas (`fixed bottom-0 max-w-md`) qui doit être repositionnée sur desktop (voir section RouteDetail ci-dessous).

## Navigation

**Nouveau composant `TopNav.tsx`** — barre fixe en haut, full width, visible uniquement sur desktop (`hidden md:flex`).

Contenu : les 5 mêmes items que le `BottomNav` actuel (icônes Material Symbols + labels français), même logique d'état actif, même gestion des rôles (admin/premium/free). Réutiliser l'objet `navColors` de `BottomNav` (ou le dupliquer dans `TopNav`).

Style : fond `bg-cream`, bordure basse `border-b-2 border-climb-dark`, hauteur fixe ~64px. Items en ligne avec gap, actif = pill colorée (même pattern que BottomNav avec fond coloré à 15% d'opacité).

**`BottomNav.tsx`** : ajouter `md:hidden` sur le container racine. Aucun autre changement.

**Import dans chaque page authentifiée** : ajouter `<TopNav />` en tout premier enfant de chaque page protégée. `Login` et `Register` (pages publiques) ne reçoivent PAS `TopNav`.

## Contrainte de largeur et overflow

Sur mobile (< md) : comportement inchangé — `max-w-md mx-auto overflow-hidden` conservé.

Sur desktop (≥ md) : modifier le container principal de chaque page :
- `md:max-w-none` — lève la contrainte 428px
- `md:overflow-visible` — remplace `overflow-hidden` pour ne pas clipper les colonnes et les éléments absolus (dropdowns, overlays)

Exemple de classe container desktop : `relative min-h-screen flex flex-col w-full max-w-md md:max-w-none mx-auto overflow-hidden md:overflow-visible bg-cream`

## Layouts 2 colonnes par page

Chaque page enveloppe son contenu dans `md:flex md:gap-6 md:items-start` avec `min-w-0` sur chaque colonne pour éviter l'écrasement. Les proportions varient selon le contenu.

### RoutesHub (`/routes`)
- **Gauche (`md:w-72 flex-shrink-0`)** : panneau filtres/recherche (actuellement en haut de page, devient sidebar fixe `md:sticky md:top-20`)
- **Droite (`flex-1 min-w-0`)** : grille de cartes de blocs (`md:grid-cols-2 lg:grid-cols-3`)

### Dashboard (`/`)
- **Gauche (`md:w-80 flex-shrink-0`)** : stats utilisateur + accès rapide (créer bloc, etc.)
- **Droite (`flex-1 min-w-0`)** : activité récente + blocs récents

### RouteDetail (`/routes/:id`)
- **Gauche (`md:w-1/2 min-w-0`)** : photo principale + infos du bloc (nom, difficulté, secteur, description, tips, hold detection)
- **Droite (`md:w-1/2 min-w-0`)** : validations, commentaires, boutons d'action (valider, analyser)
- **Barre d'action fixe (`fixed bottom-0 max-w-md`)** : sur desktop, la remplacer par une section inline dans la colonne droite (en haut) — ajouter `md:hidden` sur la barre fixe et créer un équivalent `hidden md:block` dans la colonne droite.

### Leaderboard (`/leaderboard`)
- **Gauche (`flex-1 min-w-0`)** : tableau de classement
- **Droite (`md:w-80 flex-shrink-0`)** : profil de l'utilisateur sélectionné. Ajouter un state local `selectedUserId` (null par défaut). Cliquer sur une ligne → affiche le profil. Si null → placeholder "Sélectionnez un utilisateur".

### Friends (`/friends`)
- **Gauche (`md:w-72 flex-shrink-0`)** : liste d'amis + recherche
- **Droite (`flex-1 min-w-0`)** : profil de l'ami sélectionné. Même pattern que Leaderboard avec `selectedUserId`. Placeholder si aucun sélectionné.

### CreateRoute (`/routes/create`)
- **Gauche (`md:w-1/2 min-w-0`)** : formulaire complet
- **Droite (`md:w-1/2 min-w-0`)** : aperçu en temps réel (photo uploadée, couleur sélectionnée, hold overlay) — affiche les données du formData en lecture seule

### UserProfile (`/users/:id`)
- **Gauche (`md:w-80 flex-shrink-0`)** : avatar, stats, infos profil
- **Droite (`flex-1 min-w-0`)** : liste des blocs validés / activité

### Pages secondaires (top nav + centrage, pas de 2 colonnes)

Ces pages reçoivent `TopNav`, leur container passe à `md:max-w-2xl mx-auto`, mais restent en 1 colonne :
- `Admin.tsx`
- `Pricing.tsx`
- `NotificationSettings.tsx`
- `HoldDetection.tsx`
- `AnalyzeVideo.tsx`
- `AnalysisResults.tsx`

`Login.tsx` et `Register.tsx` : **aucune modification** (pages publiques, pas de TopNav).

## Ce qui ne change pas

- Tout le style visuel : couleurs, ombres `shadow-neo`, bordures, fonts Lexend
- Comportement mobile : inchangé sous `md:`
- Logique métier, appels API, state management
- Animations et interactions (press, hover)

## Implémentation

### Fichiers créés
- `apps/web/src/components/TopNav.tsx` — navigation desktop

### Fichiers modifiés
- `apps/web/src/components/BottomNav.tsx` — `md:hidden`
- `apps/web/src/pages/Dashboard.tsx` — TopNav + 2 colonnes
- `apps/web/src/pages/RoutesHub.tsx` — TopNav + 2 colonnes
- `apps/web/src/pages/RouteDetail.tsx` — TopNav + 2 colonnes + barre fixe repositionnée
- `apps/web/src/pages/Leaderboard.tsx` — TopNav + 2 colonnes + selectedUserId
- `apps/web/src/pages/Friends.tsx` — TopNav + 2 colonnes + selectedUserId
- `apps/web/src/pages/CreateRoute.tsx` — TopNav + 2 colonnes
- `apps/web/src/pages/UserProfile.tsx` — TopNav + 2 colonnes
- `apps/web/src/pages/Admin.tsx` — TopNav + centrage
- `apps/web/src/pages/Pricing.tsx` — TopNav + centrage
- `apps/web/src/pages/NotificationSettings.tsx` — TopNav + centrage
- `apps/web/src/pages/HoldDetection.tsx` — TopNav + centrage
- `apps/web/src/pages/AnalyzeVideo.tsx` — TopNav + centrage
- `apps/web/src/pages/AnalysisResults.tsx` — TopNav + centrage

## Ajustements de spacing desktop

**Padding bas des zones scrollables** : chaque page utilise `pb-24` (ou `pb-32`) pour éviter que le contenu soit masqué par la `BottomNav`. Sur desktop, ajouter `md:pb-6` pour annuler ce padding devenu inutile.

**Padding haut des headers internes** : certaines pages ont un `pt-12` sur leur header sticky (compensation status bar mobile). Sur desktop avec la `TopNav` de 64px, remplacer par `md:pt-4`. Le contenu scrollable doit avoir `md:pt-20` (ou utiliser `md:sticky md:top-20`) pour s'aligner sous la TopNav fixe.



- Sur mobile : comportement identique à aujourd'hui
- Sur desktop (≥768px) : top nav visible, bottom nav masquée, layout 2 colonnes fonctionnel
- Aucun clipping de contenu sur desktop (overflow-visible)
- Style cohérent avec le mobile (pas de nouveaux design tokens)
- Pas de régression sur les fonctionnalités existantes

# Plan de Développement ClimbTracker

Ce document organise le développement de ClimbTracker en 8 projets distincts et indépendants, permettant une approche modulaire et itérative.

> **Note stack :** Le projet utilise **Hono** (pas Express), **Better Auth** (pas JWT custom), **Drizzle ORM** (pas Prisma), **Supabase PostgreSQL** (pas Redis), **TanStack Query** (pas Zustand/Axios).

---

## 📊 Vue d'ensemble des projets

| Projet | Nom | Durée | Dépendances | Priorité | Statut |
|--------|-----|-------|-------------|----------|--------|
| P1 | Infrastructure & Auth | 2 sem | Aucune | Critique | ✅ Terminé |
| P2 | Gestion des Voies | 2 sem | P1 | Critique | ✅ Terminé |
| P3 | Fonctionnalités Sociales | 2 sem | P1, P2 | Critique | ✅ Terminé |
| P4 | Polish & Déploiement MVP | 2 sem | P1, P2, P3 | Critique | 🟡 Partiel |
| P5 | Médias & Recherche Avancée | 3 sem | P4 | Haute | 🟡 Partiel |
| P6 | Engagement & Notifications | 3 sem | P4 | Haute | 🟡 Partiel |
| P7 | IA - Détection Prises | 4 sem | P4 | Moyenne | 🟡 MVP livré |
| P8 | IA - Analyse Mouvement | 4 sem | P4, P7 | Moyenne | 🟡 MVP livré |

---

## PROJET 1: Infrastructure & Authentification
**Durée:** 2 semaines
**Statut:** ✅ Terminé

### Livrables

#### Backend
- [x] Configuration serveur Hono complet (`apps/api/src/index.ts`)
- [x] Connexion PostgreSQL via Supabase + Drizzle ORM
- [ ] Redis (non utilisé — remplacé par Supabase)
- [x] Migrations Drizzle initiales (User, Role, Sessions, Accounts, Verifications)
- [x] Middleware d'authentification via Better Auth (`apps/api/src/middleware/auth.middleware.ts`)
- [x] API Endpoints Auth (gérés par Better Auth) :
  - `POST /api/auth/sign-up`
  - `POST /api/auth/sign-in`
  - `POST /api/auth/sign-out`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- [x] Guards de rôles (CLIMBER, OPENER, ADMIN) (`requireRole`)
- [ ] Rate limiting sur les routes auth (non implémenté)
- [x] Validation Zod des entrées (`apps/api/src/env.ts`)
- [ ] Tests unitaires auth >80% coverage (partiel — `helpers.test.ts`, `health.test.ts`)

#### Frontend
- [x] Configuration routing React Router (`apps/web/src/App.tsx`)
- [x] Pages auth :
  - [x] Login (`pages/Login.tsx`) — OAuth Google/Apple/Facebook inclus
  - [x] Register (`pages/Register.tsx`)
  - [ ] Forgot Password (page dédiée non trouvée — géré via Better Auth)
  - [ ] Reset Password (page dédiée non trouvée — géré via Better Auth)
- [x] Auth client Better Auth (`lib/auth-client.ts`)
- [x] Protected routes (`App.tsx`)
- [x] Gestion session automatique via Better Auth + TanStack Query
- [x] `useAuth` hook (`hooks/useAuth.ts`)
- [x] Composants UI auth réutilisables (Radix UI)
- [x] Formulaires avec validation (react-hook-form + zod)

#### DevOps
- [ ] Docker Compose finalisé (non présent)
- [ ] Scripts de seed database (non présents)
- [x] Variables d'environnement documentées (`apps/api/src/env.ts`)
- [ ] CI/CD basique (non configuré)

### Critères de succès
- ✅ Un utilisateur peut s'inscrire, se connecter et se déconnecter
- ✅ Les sessions sont correctement gérées (Better Auth)
- ✅ Les rôles sont appliqués correctement

---

## PROJET 2: Gestion des Voies
**Durée:** 2 semaines
**Dépendances:** P1
**Statut:** ✅ Terminé

### Livrables

#### Backend
- [x] Schema Drizzle: Route model (`packages/database/src/schema/routes.ts`)
- [x] Service upload Cloudinary (`apps/api/src/routes/upload.ts`, `apps/web/src/lib/upload.ts`)
- [x] API Endpoints Routes :
  - [x] `GET /api/routes` (public, avec filtres)
  - [x] `GET /api/routes/:id` (public)
  - [x] `POST /api/routes` (OPENER+)
  - [x] `PUT /api/routes/:id` (OPENER propriétaire)
  - [x] `DELETE /api/routes/:id`
  - [x] `PUT /api/routes/:id/status` (ADMIN)
- [x] Upload endpoints :
  - [x] `POST /api/upload/route-photo`
  - [x] `POST /api/upload/user-photos`
  - [x] `DELETE /api/upload/photo`
- [x] Validation fichiers (type)
- [x] Compression images automatique (via Cloudinary)
- [ ] Génération thumbnails vidéo (non implémenté)
- [x] Workflow validation ADMIN (PENDING → ACTIVE → ARCHIVED)
- [ ] Tests API routes (non écrits — uniquement health check)

#### Frontend
- [x] Page Hub des voies — `pages/RoutesHub.tsx`
- [x] Page détail voie — `pages/RouteDetail.tsx`
- [x] Formulaire création voie (OPENER) — `pages/CreateRoute.tsx`
- [x] Formulaire édition voie (OPENER) — `components/EditRouteModal.tsx`
- [x] Upload photo avec preview — `components/ImageUpload.tsx`
- [ ] Upload vidéo avec progress bar (non implémenté)
- [x] Filtres :
  - [x] Par grade (`GradeFilter.tsx`)
  - [x] Par couleur (`HoldColorFilter.tsx`)
  - [x] Par secteur (`GymLayoutFilter.tsx`)
  - [x] Par statut (`ValidationStatusFilter.tsx`)
  - [x] Par date (`DateFilter.tsx`)
- [x] Composants :
  - [x] RouteCard — `RouteCardWithStatus.tsx`
  - [x] RouteFilters — filtres intégrés dans RoutesHub
  - [x] RouteForm — CreateRoute / EditRouteModal
  - [x] MediaUploader — `ImageUpload.tsx`
- [x] Interface validation admin — `components/admin/AdminRoutes.tsx`
- [x] Responsive design (Tailwind + Radix UI)

#### Packages/Shared
- [x] Types RouteStatus, DifficultyColor, HoldColorCategory (`packages/database/src/schema/enums.ts`)
- [x] Constantes (grades, couleurs) — `apps/web/src/utils/gradeColors.ts`
- [ ] Schemas Zod partagés (validation côté serveur via Hono, non partagé en package)

### Critères de succès
- ✅ Un ouvreur peut créer une voie complète
- ✅ Photos s'uploadent correctement (Cloudinary)
- ✅ Les filtres fonctionnent
- ✅ Admin peut valider/archiver les voies
- ✅ UI responsive mobile/desktop

---

## PROJET 3: Fonctionnalités Sociales
**Durée:** 2 semaines
**Dépendances:** P1, P2
**Statut:** ✅ Terminé (+ extras : amis, leaderboard)

### Livrables

#### Backend
- [x] Schema Drizzle: Validation, Comment, Video models
- [x] API Endpoints Validations :
  - [x] `POST /api/routes/:id/validate`
  - [x] `DELETE /api/routes/:id/validate`
  - [x] `GET /api/routes/:id/validations`
  - [x] `GET /api/users/:id/validations`
- [x] API Endpoints Comments :
  - [x] `POST /api/routes/:id/comments`
  - [x] `PUT /api/comments/:id`
  - [x] `DELETE /api/comments/:id`
  - [x] `GET /api/routes/:id/comments`
- [x] API Endpoints Users :
  - [x] `GET /api/users/:id`
  - [x] `PUT /api/users/:id`
  - [x] `GET /api/users/:id/stats`
- [x] Calcul statistiques utilisateur
- [ ] Pagination commentaires (non confirmé)
- [ ] Modération commentaires (ADMIN) (non confirmé)
- [x] **BONUS** — API Amis (`apps/api/src/routes/friendships.ts`)
- [x] **BONUS** — API Leaderboard (`apps/api/src/routes/leaderboard.ts`)

#### Frontend
- [x] Système de validation — `QuickStatusMenu.tsx`, `UserValidationDetailsModal.tsx`
- [x] Affichage liste validations
- [x] Section commentaires — `CommentList.tsx`
- [x] Formulaire commentaire — `CommentForm.tsx`
- [x] Upload média dans commentaire (schema support, IMAGE/VIDEO)
- [x] Page profil utilisateur — `pages/UserProfile.tsx` :
  - [x] Informations personnelles
  - [x] Statistiques (voies validées, par grade, etc.)
  - [x] Liste des validations
  - [x] Activité / historique
- [x] Édition profil — `ProfileEditForm.tsx`
- [x] Avatar upload — `ImageUpload.tsx`
- [x] Composants :
  - [x] ValidationButton — QuickStatusMenu
  - [x] CommentList
  - [x] CommentForm
  - [x] UserStats
  - [x] UserProfile
  - [x] KiviatChart (radar chart des compétences)
- [x] **BONUS** — Page Amis `pages/Friends.tsx`
- [x] **BONUS** — Page Leaderboard `pages/Leaderboard.tsx`

### Critères de succès
- ✅ Un grimpeur peut valider/invalider une voie (EN_PROJET, VALIDE, flash, tentatives)
- ✅ Les commentaires s'affichent et se créent
- ✅ Le profil affiche les stats correctes
- ✅ Système d'amis fonctionnel (bonus)
- ✅ Leaderboard global et amis (bonus)

---

## PROJET 4: Polish & Déploiement MVP
**Durée:** 2 semaines
**Dépendances:** P1, P2, P3
**Statut:** 🟡 Partiel

### Livrables

#### Optimisations
- [ ] Optimisation requêtes Drizzle (includes, selects)
- [ ] Mise en cache (Redis non utilisé)
- [ ] Lazy loading images
- [ ] Code splitting React
- [ ] Bundle size optimization
- [x] Compression assets (Cloudinary CDN)
- [x] CDN pour médias statiques (Cloudinary)
- [ ] Indexes database

#### Testing
- [ ] Tests E2E critiques (Playwright/Cypress)
- [ ] Tests d'intégration API
- [x] Tests composants React (`HoldColorIndicator.test.tsx`, `utils.test.ts`)
- [ ] Tests de charge (k6/Artillery)
- [ ] Tests responsive
- [ ] Tests accessibilité (a11y)

#### Documentation
- [ ] Documentation API (Swagger/OpenAPI)
- [ ] Guide développeur
- [ ] Guide déploiement
- [ ] Changelog
- [ ] README complet

#### Déploiement
- [ ] Configuration production complète (Vercel/Railway/Fly.io)
- [ ] CI/CD complet (GitHub Actions)
- [ ] Monitoring: Sentry
- [x] Analytics: infrastructure présente (`packages/analytics/`)
- [ ] Logs centralisés
- [x] Health checks (`apps/api/src/routes/` — endpoint health)
- [ ] Backups automatiques database

#### UX/UI
- [x] Design system (Radix UI + Tailwind)
- [ ] Animations et transitions (à compléter)
- [ ] Loading states généralisés
- [ ] Error states généralisés
- [ ] Empty states
- [x] Messages de succès/erreur cohérents (Toast notifications)
- [x] Toast notifications (`components/ui/toaster.tsx`)
- [ ] SEO basique (meta tags, sitemap)

### Critères de succès
- ❌ Application déployée en production
- ❌ Tests E2E passent à 100%
- ❌ Performance Lighthouse > 90 (non mesuré)
- ❌ Monitoring actif
- ❌ Documentation complète

---

## PROJET 5: Médias & Recherche Avancée
**Durée:** 3 semaines
**Dépendances:** P4
**Statut:** 🟡 Partiel

### Livrables

#### Backend
- [x] API galerie photos (upload.ts — route-photo, user-photos)
- [ ] `POST /api/routes/:id/media` (endpoint dédié galerie non implémenté)
- [ ] `DELETE /api/media/:id` (delete partiel via upload.ts)
- [ ] Processing vidéo asynchrone (Bull queue)
- [ ] Génération thumbnails multiples résolutions
- [ ] Compression vidéo automatique
- [ ] Watermarking
- [x] Recherche full-text intégrée dans `GET /api/routes` (paramètre `search`)
- [ ] API Search dédiée `GET /api/search`
- [x] Filtres avancés combinés (grade, couleur, secteur, statut, date)
- [x] Tri multi-critères
- [ ] Sauvegarde recherches utilisateur

#### Frontend
- [x] Galerie photos (`ImageViewer.tsx`)
- [ ] Galerie vidéos avec player dédié
- [x] Upload multiple fichiers (`ImageUpload.tsx`)
- [ ] Progress bar upload multiple
- [x] Barre de recherche globale (dans RoutesHub)
- [ ] Page résultats recherche dédiée
- [x] Filtres avancés UI (GradeFilter, HoldColorFilter, GymLayoutFilter, DateFilter, ValidationStatusFilter)
- [ ] Sauvegarde filtres favoris
- [ ] Historique recherches
- [ ] Suggestions auto-complete

#### Workers
- [ ] Worker compression vidéo
- [ ] Worker génération thumbnails
- [ ] Worker indexation recherche

### Critères de succès
- 🟡 Upload multiple médias (photos OK, vidéo non)
- 🟡 Galeries (photos OK, vidéos non)
- 🟡 Recherche fonctionnelle (basique OK, avancée non)
- ✅ Filtres combinables

---

## PROJET 6: Engagement & Notifications
**Durée:** 3 semaines
**Dépendances:** P4
**Statut:** 🟡 Partiel (infrastructure complète, envoi non activé)

### Livrables

#### Backend
- [x] Système de notifications en base (`packages/database/src/schema/notifications.ts`)
- [x] Types : FRIEND_REQUEST, FRIEND_ACCEPTED, ROUTE_VALIDATED, COMMENT_RECEIVED, ROUTE_CREATED, ACHIEVEMENT_UNLOCKED, SYSTEM
- [x] API Notifications :
  - [x] `GET /api/notifications`
  - [x] `PUT /api/notifications/:id/read`
  - [x] `PUT /api/notifications/read-all`
  - [x] `DELETE /api/notifications/:id`
- [x] Préférences notifications utilisateur (JSON dans users table)
- [x] Infrastructure email (SendGrid — `packages/notifications/src/sendgrid.ts`)
- [ ] Email notifications actives (credentials non configurés)
- [ ] WebSocket pour real-time (non implémenté)
- [x] Infrastructure push web (VAPID — `packages/notifications/src/web-push.ts`)
- [x] Infrastructure FCM (`packages/notifications/src/fcm.ts`)
- [ ] Push notifications actives (credentials non configurés)
- [x] Statistiques avancées (stats par user dans `GET /api/users/:id`)
- [x] `GET /api/users/:id/stats`
- [ ] `GET /api/users/:id/stats/progression` (détail progression non exposé)
- [ ] `GET /api/users/:id/stats/calendar` (calendrier d'activité non implémenté)
- [ ] `GET /api/stats/global`

#### Frontend
- [x] Bell icon avec badge count — `NotificationBell.tsx`
- [ ] Dropdown notifications (non trouvé — page dédiée à la place)
- [x] Page notifications settings — `NotificationSettings.tsx`
- [x] Marquage lu/non-lu
- [x] Settings notifications (email + push par type)
- [x] KiviatChart (radar chart compétences) — `KiviatChart.tsx`
- [x] **BONUS** Leaderboard avec graphiques — `Leaderboard.tsx`
- [ ] Graphiques progression temporels (Chart.js/Recharts)
- [ ] Calendrier activité (heatmap)
- [ ] Badges achievements
- [ ] Objectifs personnels
- [x] Partage profil (page UserProfile accessible par ID)
- [ ] Export données personnelles
- [x] PWA / push notifications infrastructure (`lib/capacitor/push.ts`, `hooks/usePushNotifications.ts`)

#### Gamification
- [ ] Système de badges
- [ ] Achievements (type ACHIEVEMENT_UNLOCKED prévu en DB)
- [ ] Streaks
- [x] Leaderboards (global + amis)

#### Premium (BONUS)
- [x] Stripe intégration complète (`packages/payments/`)
- [x] Page Pricing (`pages/Pricing.tsx`)
- [x] Hook `usePremiumStatus`
- [x] Webhook Stripe
- [x] Portail facturation

### Critères de succès
- 🟡 Notifications temps réel (in-app OK, email/push non actives)
- 🟡 Stats utilisateur (basiques OK, progression/calendrier non)
- ✅ Leaderboard visuellement clair
- 🟡 PWA installable (infrastructure Capacitor OK)

---

## PROJET 7: IA - Détection des Prises
**Durée:** 4 semaines
**Dépendances:** P4
**Statut:** 🟡 MVP livré (Canvas API + HSV, client-side)

> **Implémentation :** Détection client-side via Canvas API + HSV thresholding (zéro dépendance).
> Pas de modèle TensorFlow.js — approche couleur directe jugée suffisante pour l'usage.

### Livrables

#### Algorithme
- [x] Conversion hex → HSV (`apps/web/src/lib/ai/hold-detection.ts`)
- [x] Scan pixel avec tolérance HSV configurable
- [x] Grid-based clustering + flood-fill
- [x] Génération cercles normalisés avec score de confiance
- [ ] Amélioration tolérance adaptative (luminosité variable)
- [ ] Détection multi-couleurs simultanée
- [ ] Mode "calibration" sur couleur échantillonnée depuis la photo

#### Backend
- [x] `GET /api/routes/:id/hold-map` — lecture hold mapping
- [x] `PUT /api/routes/:id/hold-map` — sauvegarde (OPENER/ADMIN propriétaire)
- [ ] `POST /api/ai/detect-holds` — fallback serveur (sharp + analyse pixel)
- [ ] Cache hold-map (stale-while-revalidate)

#### Frontend
- [x] `HoldOverlay.tsx` — overlay SVG interactif (drag, clic suppression, ajout manuel)
- [x] `HoldDetection.tsx` — page `/routes/:id/holds` (OPENER/ADMIN)
- [x] Intégration `RouteDetail.tsx` — affichage readOnly + bouton "Mapper"
- [x] `holdDetectionAPI` dans `lib/api/index.ts`
- [ ] Curseur couleur pour ajuster la teinte cible manuellement
- [ ] Slider tolérance HSV (UI de réglage fin)
- [ ] Export hold-map en image annotée

---

## PROJET 8: IA - Analyse Mouvement
**Durée:** 4 semaines
**Dépendances:** P4, P7
**Statut:** 🟡 MVP livré (Claude Opus 4.6 Vision via @anthropic-ai/sdk)

> **Implémentation :** Extraction de 5 frames Cloudinary (so_10p → so_90p) + analyse Claude Vision.
> Pas de MediaPipe — Claude Vision suffit pour le niveau de détail actuel.
> **Prérequis :** `ANTHROPIC_API_KEY` dans `.env` + Cloudinary configuré.

### Livrables

#### IA/Vision
- [x] Extraction frames Cloudinary (`extractCloudinaryFrames()` — URL transformations)
- [x] Appel Claude Opus 4.6 avec adaptive thinking (`analyzeWithClaude()`)
- [x] Prompt structuré → JSON scores + suggestions + highlights
- [x] Calcul score global pondéré (`aggregateScores()`)
- [ ] Fallback si Claude renvoie JSON invalide (retry + scores par défaut améliorés)
- [ ] Extraction frames locale (sharp) si Cloudinary non configuré
- [ ] Prompt multi-langue (EN/FR selon user locale)

#### Backend
- [x] Schema Drizzle: Analysis model (`analyses.ts`) — déjà en DB
- [x] `POST /api/ai/analyze-video` — upload + frames + Claude + stockage
- [x] `GET /api/analysis/:id` — avec video + route
- [x] `GET /api/analysis/route/:routeId` — analyses d'une voie
- [x] `GET /api/analysis/user/:userId` — analyses d'un utilisateur
- [ ] Job queue (BullMQ) — analyse asynchrone pour éviter timeout HTTP
- [ ] Webhook / SSE pour notifier la fin d'analyse
- [ ] Notification in-app "Votre analyse est prête"
- [ ] Rate limiting (max 3 analyses/jour/user sans premium)

#### Frontend
- [x] `AnalyzeVideo.tsx` — `/routes/:id/analyze` (upload + progression XHR)
- [x] `AnalysisResults.tsx` — `/analysis/:id` (cercle global + barres + suggestions)
- [x] `analysisAPI` dans `lib/api/index.ts`
- [x] Intégration `RouteDetail.tsx` — bouton "Analyser" + liste analyses récentes
- [ ] Radar chart (KiviatChart existant réutilisable)
- [ ] Comparaison deux analyses côte à côte
- [ ] Historique complet `/users/:id/analyses`
- [ ] Export rapport PDF (html2canvas ou jsPDF)

---

## 📅 Timeline Recommandé

### Phase 1: MVP (2 mois) — ✅ TERMINÉE
```
Mois 1:
├─ Semaines 1-2: P1 (Infrastructure & Auth) ✅
└─ Semaines 3-4: P2 (Gestion Voies) ✅

Mois 2:
├─ Semaines 5-6: P3 (Fonctionnalités Sociales) ✅
└─ Semaines 7-8: P4 (Polish & Déploiement) 🟡 Partiel
```

### Phase 2: Enrichissement (2 mois) — 🟡 EN COURS
```
Mois 3:
├─ Semaines 9-11: P5 (Médias & Recherche) 🟡 Partiel
└─ Semaines 12-14: P6 (Engagement & Notifs) 🟡 Partiel

Mois 4:
└─ Semaines 15-16: Buffer & fixes
```

### Phase 3: Intelligence Artificielle (2 mois) — 🟡 MVP LIVRÉ
```
Mois 5:
└─ Semaines 17-20: P7 (Détection Prises) ✅ MVP — HSV client-side

Mois 6:
└─ Semaines 21-24: P8 (Analyse Mouvement) ✅ MVP — Claude Vision
```

---

## 🎯 Prochaines étapes de développement

> Mis à jour le 2026-02-26 — Phase 3 (P7+P8) MVP livrée.

---

### 🔴 Blockers immédiats (à faire avant de tester)

#### 1. Variables d'environnement manquantes

Ajouter dans `.env` (racine du projet) :

```bash
# P8 — Analyse IA (REQUIS pour que l'analyse vidéo fonctionne)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Cloudinary (déjà configuré — vérifier que resource_type video est activé)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

> **Sans `ANTHROPIC_API_KEY`**, `POST /api/ai/analyze-video` retourne 503.
> **Sans Cloudinary**, l'analyse vidéo est impossible (frames non extractibles).

#### 2. Vérifier Cloudinary — autorisations vidéo

Dans le dashboard Cloudinary, s'assurer que le plan autorise l'upload de ressources `video`.
Le plan gratuit Cloudinary supporte les vidéos jusqu'à ~100MB.

---

### 🟡 Améliorations P7 (Hold Detection) — Priorité haute

#### A. Réglage manuel de la tolérance HSV
**Fichier :** `apps/web/src/pages/HoldDetection.tsx`
**Quoi :** Ajouter un slider `<input type="range" min="0.5" max="2" step="0.1">` qui passe la valeur `tolerance` à `detectHolds(canvas, hex, tolerance)`.
**Pourquoi :** Les prises de couleur similaire au mur sont parfois mal détectées.

#### B. Picker de couleur depuis la photo
**Fichier :** `apps/web/src/components/HoldOverlay.tsx`
**Quoi :** Mode "eyedropper" — clic sur un pixel de l'image → extraire sa couleur hex → relancer `detectHolds()` avec cette couleur au lieu de `route.holdColorHex`.
**Pourquoi :** La couleur saisie lors de la création de voie peut différer de la teinte exacte des prises sur photo.

```typescript
// Exemple d'extraction couleur depuis canvas
const ctx = canvas.getContext('2d');
const pixel = ctx.getImageData(x, y, 1, 1).data;
const hex = `#${pixel[0].toString(16).padStart(2,'0')}${pixel[1].toString(16).padStart(2,'0')}${pixel[2].toString(16).padStart(2,'0')}`;
```

#### C. Afficher le hold-map dans les cards de voies
**Fichier :** `apps/web/src/pages/RoutesHub.tsx` + `apps/web/src/components/RouteCardWithStatus.tsx`
**Quoi :** Petit badge "✓ prises mappées" sur les RouteCards qui ont un `holdMapping`.
**API :** `holdMapping` est déjà retourné par `GET /api/routes`.

---

### 🟡 Améliorations P8 (Analyse Mouvement) — Priorité haute

#### A. Analyse asynchrone (éviter timeout)
**Problème :** L'appel Claude peut durer 30-60 secondes. Le XHR risque de timeout.
**Solution :** Passer en job asynchrone.

```
1. POST /api/ai/analyze-video
   → Upload vidéo → créer video{} → créer analyses{status: 'processing'}
   → Déclencher job en background (setImmediate ou BullMQ)
   → Retourner { analysisId } immédiatement (202 Accepted)

2. GET /api/analysis/:id
   → Si status === 'processing' → retourner { status: 'processing' }
   → Si status === 'done' → retourner les scores

3. Frontend : polling toutes les 3s sur GET /api/analysis/:id
```

**Fichiers à modifier :**
- `apps/api/src/routes/analyses.ts` — retourner 202 + lancer analyse en arrière-plan
- `apps/api/src/services/video-analysis.service.ts` — pas de changement
- `apps/web/src/pages/AnalyzeVideo.tsx` — polling sur `analysisAPI.getAnalysis(id)` au lieu de l'état XHR

**Note DB :** Ajouter un champ `status` dans la table `analyses` via migration Drizzle :
```typescript
// packages/database/src/schema/analyses.ts
status: varchar('status', { length: 20 }).notNull().default('processing'),
// valeurs : 'processing' | 'done' | 'error'
```

#### B. Radar chart (KiviatChart existant)
**Fichier :** `apps/web/src/pages/AnalysisResults.tsx`
**Quoi :** Remplacer les barres de progression par le `KiviatChart` déjà existant.
**Import :** `import { KiviatChart } from '../components/KiviatChart'`
**Data :** Mapper les 5 dimensions dans le format attendu par KiviatChart.

#### C. Historique analyses utilisateur
**Fichier :** `apps/web/src/pages/UserProfile.tsx`
**Quoi :** Ajouter une section "Mes analyses" avec `analysisAPI.getUserAnalyses(userId)`.
**Afficher :** Tableau des dernières analyses avec score, voie, date.

---

### 🟠 Finir P4 (Polish & Déploiement) — Priorité moyenne

#### Déploiement production
```
Frontend  → Vercel (auto-deploy sur push master)
Backend   → Railway ou Fly.io (Dockerfile à créer)
Base de données → Supabase (déjà configuré)
Médias    → Cloudinary (déjà configuré)
```

**Variables d'env production à configurer :**
```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<32 chars random>
BETTER_AUTH_URL=https://api.climbtracker.app
FRONTEND_URL=https://climbtracker.app
CLOUDINARY_*=...
ANTHROPIC_API_KEY=...
```

#### CI/CD GitHub Actions
Créer `.github/workflows/ci.yml` :
```yaml
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
```

#### Activer les notifications
1. Créer un compte SendGrid → configurer `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL`
2. Générer clés VAPID → `npx web-push generate-vapid-keys` → configurer `VAPID_*`
3. Les routes et le code sont déjà en place (`apps/api/src/lib/notifications.ts`)

---

### 🟢 Nouvelles features (Phase 4 — post-MVP)

#### P9 — Mode gym / Plan de salle interactif
- Plan SVG de la salle avec secteurs cliquables
- Vue "vue du dessus" avec densité de voies par secteur
- Filtrage des voies par zone géographique sur le plan

#### P10 — Comparaison et progression
- Graphique de progression grade max par semaine/mois
- Comparaison avec "grimpeurs similaires" (même niveau)
- Objectifs personnels avec tracking

#### P11 — Social renforcé
- Stories d'escalade (vidéo courte 15s à la Instagram)
- Challenges entre amis (qui valide une voie en premier)
- Commentaires avec timestamp vidéo

---

### 🔧 Qualité & Tests

#### TypeScript strict mode
Activer dans `tsconfig.json` :
```json
{ "strict": true, "noUncheckedIndexedAccess": true }
```
Corriger les erreurs qui apparaissent.

#### Tests Playwright E2E
Parcours critiques à couvrir :
1. Inscription → connexion → déconnexion
2. Créer voie → mapper prises → sauvegarder
3. Uploader vidéo → attendre analyse → voir résultats
4. Valider une voie → vérifier apparition leaderboard

#### Validation Zod API
Toutes les routes nouvelles (hold-detection, analyses) n'utilisent pas encore `@hono/zod-validator`.
Ajouter validation sur les bodies :
```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const holdMapSchema = z.object({
  holdMapping: z.array(z.object({
    id: z.string().uuid(),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    radius: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
  }))
});

app.put('/:id/hold-map', requireAuth, requireRole('OPENER','ADMIN'),
  zValidator('json', holdMapSchema), async (c) => { ... });
```

---

*Ce plan est vivant et mis à jour automatiquement selon l'état réel du projet.*

# Plan de Développement ClimbTracker

Ce document organise le développement de ClimbTracker en 8 projets distincts et indépendants, permettant une approche modulaire et itérative.

---

## 📊 Vue d'ensemble des projets

| Projet | Nom | Durée | Dépendances | Priorité |
|--------|-----|-------|-------------|----------|
| P1 | Infrastructure & Auth | 2 sem | Aucune | Critique |
| P2 | Gestion des Voies | 2 sem | P1 | Critique |
| P3 | Fonctionnalités Sociales | 2 sem | P1, P2 | Critique |
| P4 | Polish & Déploiement MVP | 2 sem | P1, P2, P3 | Critique |
| P5 | Médias & Recherche Avancée | 3 sem | P4 | Haute |
| P6 | Engagement & Notifications | 3 sem | P4 | Haute |
| P7 | IA - Détection Prises | 4 sem | P4 | Moyenne |
| P8 | IA - Analyse Mouvement | 4 sem | P4, P7 | Moyenne |

---

## PROJET 1: Infrastructure & Authentification
**Durée:** 2 semaines
**Équipe:** Backend (2) + Frontend (1) + DevOps (1)
**Statut:** 🔴 Non démarré

### Objectifs
Créer les fondations techniques et le système d'authentification complet.

### Livrables

#### Backend
- [ ] Configuration serveur Express complet
- [ ] Connexion PostgreSQL + Redis
- [ ] Migrations Prisma initiales (User, Role)
- [ ] Middleware d'authentification JWT
- [ ] API Endpoints Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- [ ] Guards de rôles (CLIMBER, OPENER, ADMIN)
- [ ] Rate limiting sur les routes auth
- [ ] Validation Zod des entrées
- [ ] Tests unitaires auth (>80% coverage)

#### Frontend
- [ ] Configuration routing React Router
- [ ] Pages auth:
  - Login
  - Register
  - Forgot Password
  - Reset Password
- [ ] Context/Store auth (Zustand)
- [ ] Protected routes
- [ ] Axios interceptors pour JWT
- [ ] Gestion refresh token automatique
- [ ] Composants UI auth réutilisables
- [ ] Formulaires avec validation

#### DevOps
- [ ] Docker Compose finalisé
- [ ] Scripts de seed database
- [ ] Variables d'environnement documentées
- [ ] CI/CD basique (linting, tests)

### Critères de succès
- ✅ Un utilisateur peut s'inscrire, se connecter et se déconnecter
- ✅ Les tokens JWT sont correctement gérés (access + refresh)
- ✅ Les rôles sont appliqués correctement
- ✅ Tests passent à 100%

### Fichiers principaux
```
apps/api/src/
├── routes/auth.routes.ts
├── controllers/auth.controller.ts
├── services/auth.service.ts
├── middlewares/auth.middleware.ts
├── middlewares/roles.middleware.ts
└── utils/jwt.utils.ts

apps/web/src/
├── pages/auth/
│   ├── Login.tsx
│   ├── Register.tsx
│   └── ForgotPassword.tsx
├── stores/authStore.ts
├── hooks/useAuth.ts
└── lib/api/authApi.ts
```

---

## PROJET 2: Gestion des Voies
**Durée:** 2 semaines
**Équipe:** Backend (2) + Frontend (2)
**Dépendances:** P1
**Statut:** 🔴 Non démarré

### Objectifs
Permettre aux ouvreurs de créer, modifier et gérer les voies d'escalade.

### Livrables

#### Backend
- [ ] Migration Prisma: Route model
- [ ] Service upload Cloudinary/S3
- [ ] API Endpoints Routes:
  - `GET /api/routes` (public, avec filtres)
  - `GET /api/routes/:id` (public)
  - `POST /api/routes` (OPENER+)
  - `PUT /api/routes/:id` (OPENER propriétaire)
  - `DELETE /api/routes/:id` (ADMIN)
  - `PUT /api/routes/:id/status` (ADMIN)
- [ ] Upload endpoints:
  - `POST /api/upload/photo`
  - `POST /api/upload/video`
- [ ] Validation fichiers (taille, type)
- [ ] Compression images automatique
- [ ] Génération thumbnails vidéo
- [ ] Workflow validation ADMIN
- [ ] Tests API routes

#### Frontend
- [ ] Page Hub des voies (liste)
- [ ] Page détail voie
- [ ] Formulaire création voie (OPENER)
- [ ] Formulaire édition voie (OPENER)
- [ ] Upload photo avec preview
- [ ] Upload vidéo avec progress bar
- [ ] Filtres:
  - Par grade
  - Par couleur
  - Par secteur
  - Par statut
  - Par date
- [ ] Composants:
  - RouteCard
  - RouteFilters
  - RouteForm
  - MediaUploader
- [ ] Interface validation admin
- [ ] Responsive design

#### Packages/Shared
- [ ] Types Route, RouteStatus
- [ ] Schemas Zod pour routes
- [ ] Constantes (grades, couleurs)

### Critères de succès
- ✅ Un ouvreur peut créer une voie complète
- ✅ Photos et vidéos s'uploadent correctement
- ✅ Les filtres fonctionnent
- ✅ Admin peut valider/rejeter les voies
- ✅ UI responsive mobile/desktop

### Fichiers principaux
```
apps/api/src/
├── routes/routes.routes.ts
├── routes/upload.routes.ts
├── controllers/routes.controller.ts
├── services/routes.service.ts
├── services/media.service.ts
└── workers/media-processor.worker.ts

apps/web/src/
├── pages/
│   ├── RoutesHub.tsx
│   ├── RouteDetail.tsx
│   ├── CreateRoute.tsx (OPENER)
│   └── EditRoute.tsx (OPENER)
├── components/routes/
│   ├── RouteCard.tsx
│   ├── RouteFilters.tsx
│   ├── RouteForm.tsx
│   └── MediaUploader.tsx
└── lib/api/routesApi.ts
```

---

## PROJET 3: Fonctionnalités Sociales
**Durée:** 2 semaines
**Équipe:** Backend (2) + Frontend (2)
**Dépendances:** P1, P2
**Statut:** 🔴 Non démarré

### Objectifs
Créer l'aspect communautaire: validations, commentaires, profils.

### Livrables

#### Backend
- [ ] Migrations: Validation, Comment, Video models
- [ ] API Endpoints Validations:
  - `POST /api/routes/:id/validate`
  - `DELETE /api/routes/:id/validate`
  - `GET /api/routes/:id/validations`
  - `GET /api/users/:id/validations`
- [ ] API Endpoints Comments:
  - `POST /api/routes/:id/comments`
  - `PUT /api/comments/:id`
  - `DELETE /api/comments/:id`
  - `GET /api/routes/:id/comments`
- [ ] API Endpoints Users:
  - `GET /api/users/:id`
  - `PUT /api/users/:id`
  - `GET /api/users/:id/stats`
- [ ] Calcul statistiques utilisateur
- [ ] Pagination commentaires
- [ ] Modération commentaires (ADMIN)

#### Frontend
- [ ] Système de validation (bouton + modal)
- [ ] Affichage liste validations
- [ ] Section commentaires
- [ ] Formulaire commentaire
- [ ] Upload média dans commentaire
- [ ] Page profil utilisateur:
  - Informations personnelles
  - Statistiques (voies validées, par grade, etc.)
  - Liste des validations
  - Activité récente
- [ ] Édition profil
- [ ] Avatar upload
- [ ] Composants:
  - ValidationButton
  - CommentList
  - CommentForm
  - UserStats
  - UserProfile

### Critères de succès
- ✅ Un grimpeur peut valider/invalider une voie
- ✅ Les commentaires s'affichent et se créent
- ✅ Le profil affiche les stats correctes
- ✅ Les médias dans commentaires fonctionnent

### Fichiers principaux
```
apps/api/src/
├── routes/validations.routes.ts
├── routes/comments.routes.ts
├── routes/users.routes.ts
├── controllers/validations.controller.ts
├── controllers/comments.controller.ts
├── controllers/users.controller.ts
└── services/stats.service.ts

apps/web/src/
├── pages/
│   ├── UserProfile.tsx
│   └── EditProfile.tsx
├── components/
│   ├── ValidationButton.tsx
│   ├── CommentList.tsx
│   ├── CommentForm.tsx
│   └── UserStats.tsx
└── hooks/
    ├── useValidation.ts
    └── useComments.ts
```

---

## PROJET 4: Polish & Déploiement MVP
**Durée:** 2 semaines
**Équipe:** Full Stack (3) + DevOps (1) + QA (1)
**Dépendances:** P1, P2, P3
**Statut:** 🔴 Non démarré

### Objectifs
Finaliser, optimiser et déployer la version MVP en production.

### Livrables

#### Optimisations
- [ ] Optimisation requêtes Prisma (includes, selects)
- [ ] Mise en cache Redis (routes populaires)
- [ ] Lazy loading images
- [ ] Code splitting React
- [ ] Bundle size optimization
- [ ] Compression assets
- [ ] CDN pour médias statiques
- [ ] Indexes database

#### Testing
- [ ] Tests E2E critiques (Playwright/Cypress):
  - Parcours inscription → création voie
  - Parcours validation voie
  - Parcours commentaire
- [ ] Tests d'intégration API
- [ ] Tests composants React
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
- [ ] Configuration production:
  - Frontend: Vercel/Netlify
  - Backend: Railway/Render/Fly.io
  - Database: Supabase/Railway
  - Redis: Upstash/Railway
- [ ] CI/CD complet (GitHub Actions)
- [ ] Monitoring: Sentry (erreurs)
- [ ] Analytics: Posthog/Plausible
- [ ] Logs centralisés
- [ ] Health checks
- [ ] Backups automatiques database

#### UX/UI
- [ ] Design system finalisé
- [ ] Animations et transitions
- [ ] Loading states partout
- [ ] Error states partout
- [ ] Empty states
- [ ] Messages de succès/erreur cohérents
- [ ] Toast notifications
- [ ] SEO basique (meta tags, sitemap)

### Critères de succès
- ✅ Application déployée en production
- ✅ Tests E2E passent à 100%
- ✅ Performance Lighthouse > 90
- ✅ Monitoring actif
- ✅ Documentation complète

---

## PROJET 5: Médias & Recherche Avancée
**Durée:** 3 semaines
**Équipe:** Backend (2) + Frontend (2)
**Dépendances:** P4
**Statut:** 🔴 Non démarré

### Objectifs
Enrichir l'expérience utilisateur avec galeries média et recherche puissante.

### Livrables

#### Backend
- [ ] API Endpoints Galerie:
  - `GET /api/routes/:id/media`
  - `POST /api/routes/:id/media`
  - `DELETE /api/media/:id`
- [ ] Processing vidéo asynchrone (Bull queue)
- [ ] Génération thumbnails multiples résolutions
- [ ] Compression vidéo automatique
- [ ] Watermarking optionnel
- [ ] Recherche full-text (PostgreSQL)
- [ ] API Search:
  - `GET /api/search?q=...&filters=...`
- [ ] Filtres avancés combinés
- [ ] Tri multi-critères
- [ ] Sauvegarde recherches utilisateur

#### Frontend
- [ ] Galerie photos par voie (lightbox)
- [ ] Galerie vidéos par voie (player)
- [ ] Upload multiple fichiers
- [ ] Progress bar upload multiple
- [ ] Barre de recherche globale
- [ ] Page résultats recherche
- [ ] Filtres avancés UI:
  - Multi-grade
  - Multi-couleur
  - Multi-secteur
  - Date range
  - Popularité
  - Difficulté
- [ ] Sauvegarde filtres favoris
- [ ] Historique recherches
- [ ] Suggestions auto-complete

#### Workers
- [ ] Worker compression vidéo
- [ ] Worker génération thumbnails
- [ ] Worker indexation recherche

### Critères de succès
- ✅ Upload multiple médias fonctionnel
- ✅ Galeries fluides et rapides
- ✅ Recherche pertinente et rapide (<200ms)
- ✅ Filtres combinables

---

## PROJET 6: Engagement & Notifications
**Durée:** 3 semaines
**Équipe:** Backend (2) + Frontend (2)
**Dépendances:** P4
**Statut:** 🔴 Non démarré

### Objectifs
Augmenter l'engagement avec notifications, statistiques et gamification.

### Livrables

#### Backend
- [ ] Système de notifications:
  - Nouvelle voie dans grade préféré
  - Réponse à commentaire
  - Voie validée par ami
  - Nouvelle voie dans secteur favori
- [ ] API Notifications:
  - `GET /api/notifications`
  - `PUT /api/notifications/:id/read`
  - `PUT /api/notifications/read-all`
  - `DELETE /api/notifications/:id`
- [ ] Préférences notifications utilisateur
- [ ] Email notifications (optionnel)
- [ ] WebSocket pour real-time
- [ ] Statistiques avancées:
  - Progression par grade
  - Graphiques temporels
  - Comparaison avec moyenne
  - Calendrier d'activité (heatmap)
- [ ] API Stats:
  - `GET /api/users/:id/stats/progression`
  - `GET /api/users/:id/stats/calendar`
  - `GET /api/stats/global`

#### Frontend
- [ ] Bell icon avec badge count
- [ ] Dropdown notifications
- [ ] Page notifications complète
- [ ] Marquage lu/non-lu
- [ ] Settings notifications
- [ ] Dashboard stats utilisateur:
  - Graphiques progression (Chart.js/Recharts)
  - Calendrier activité
  - Badges achievements
  - Objectifs personnels
- [ ] Partage profil (link + preview)
- [ ] Export données personnelles
- [ ] PWA notifications push

#### Gamification (optionnel)
- [ ] Système de badges
- [ ] Achievements
- [ ] Streaks
- [ ] Leaderboards

### Critères de succès
- ✅ Notifications temps réel fonctionnelles
- ✅ Stats précises et utiles
- ✅ Graphiques visuellement clairs
- ✅ PWA installable

---

## PROJET 7: IA - Détection des Prises
**Durée:** 4 semaines
**Équipe:** ML Engineer (2) + Backend (1) + Frontend (1)
**Dépendances:** P4
**Statut:** 🔴 Non démarré

### Objectifs
Détecter automatiquement les prises d'escalade sur les photos de voies.

### Livrables

#### ML/IA
- [ ] Dataset création:
  - Collecte images prises d'escalade
  - Annotation manuelle (100+ images)
  - Augmentation données
- [ ] Modèle détection:
  - Segmentation par couleur HSV
  - Détection contours OpenCV
  - Classification type prise (optional)
- [ ] Export modèle TensorFlow.js
- [ ] Optimisation modèle (quantization)
- [ ] Tests précision (>85%)

#### Backend
- [ ] API Endpoints IA:
  - `POST /api/ai/detect-holds`
  - `GET /api/routes/:id/hold-map`
  - `PUT /api/routes/:id/hold-map`
- [ ] Worker détection asynchrone
- [ ] Stockage résultats (JSON)
- [ ] Cache résultats

#### Frontend
- [ ] Interface annotation manuelle (admin/opener)
- [ ] Visualisation prises détectées
- [ ] Overlay interactif sur photo
- [ ] Correction manuelle détection
- [ ] Activation/désactivation détection auto
- [ ] Loader pendant processing

#### Library
- [ ] `lib/ai/hold-detection.ts`
- [ ] Preprocessing image
- [ ] Post-processing résultats
- [ ] Confidence score

### Critères de succès
- ✅ Détection >85% précision sur test set
- ✅ Processing <5s par image
- ✅ UI annotation intuitive
- ✅ Fonctionne côté client (TF.js)

### Fichiers principaux
```
apps/web/src/lib/ai/
├── hold-detection.ts
├── image-preprocessing.ts
└── models/
    └── hold-detector.tfjs

apps/api/src/
├── workers/hold-detection.worker.ts
└── services/ai/
    └── hold-detection.service.ts
```

---

## PROJET 8: IA - Analyse Mouvement
**Durée:** 4 semaines
**Équipe:** ML Engineer (2) + Backend (1) + Frontend (1)
**Dépendances:** P4, P7
**Statut:** 🔴 Non démarré

### Objectifs
Analyser les mouvements d'escalade via MediaPipe et fournir feedback IA.

### Livrables

#### ML/IA
- [ ] Intégration MediaPipe Pose
- [ ] Intégration MediaPipe Hands
- [ ] Extraction poses par frame
- [ ] Calcul métriques:
  - Centre de gravité
  - Angles articulations
  - Vélocité mouvements
  - Stabilité
- [ ] Algorithme scoring:
  - Fluidité (30%)
  - Technique (25%)
  - Précision (20%)
  - Endurance (15%)
  - Créativité (10%)
- [ ] Génération suggestions automatiques
- [ ] Détection patterns sous-optimaux
- [ ] Identification moments clés (highlights)

#### Backend
- [ ] Migration: Analysis model
- [ ] API Endpoints Analyse:
  - `POST /api/ai/analyze-video`
  - `GET /api/analysis/:id`
  - `GET /api/routes/:id/analyses`
- [ ] Worker analyse vidéo (long-running)
- [ ] Queue Bull pour jobs
- [ ] Stabilisation vidéo (optional)
- [ ] Notifications fin d'analyse

#### Frontend
- [ ] Upload vidéo pour analyse
- [ ] Status analyse (pending/processing/done)
- [ ] Page résultats analyse:
  - Score global
  - Scores détaillés (radar chart)
  - Timeline avec highlights
  - Suggestions texte
  - Skeleton overlay sur vidéo
- [ ] Comparaison vidéos
- [ ] Historique analyses
- [ ] Export rapport PDF

#### Library
- [ ] `lib/ai/movement-analysis.ts`
- [ ] `lib/ai/pose-metrics.ts`
- [ ] `lib/ai/scoring-algorithm.ts`
- [ ] `lib/ai/suggestions-generator.ts`

### Critères de succès
- ✅ Analyse complète vidéo <30s
- ✅ Scores pertinents et reproductibles
- ✅ Suggestions utiles pour grimpeurs
- ✅ Visualisation claire des résultats

### Fichiers principaux
```
apps/web/src/lib/ai/
├── movement-analysis.ts
├── pose-metrics.ts
├── scoring-algorithm.ts
└── suggestions-generator.ts

apps/api/src/
├── workers/video-analysis.worker.ts
└── services/ai/
    ├── movement-analysis.service.ts
    └── video-processing.service.ts

apps/web/src/pages/
├── AnalyzeVideo.tsx
└── AnalysisResults.tsx
```

---

## 📅 Timeline Recommandé

### Phase 1: MVP (2 mois)
```
Mois 1:
├─ Semaines 1-2: P1 (Infrastructure & Auth)
└─ Semaines 3-4: P2 (Gestion Voies)

Mois 2:
├─ Semaines 5-6: P3 (Fonctionnalités Sociales)
└─ Semaines 7-8: P4 (Polish & Déploiement)
```

### Phase 2: Enrichissement (2 mois)
```
Mois 3:
├─ Semaines 9-11: P5 (Médias & Recherche)
└─ Semaines 12-14: P6 (Engagement & Notifs)

Mois 4:
└─ Semaines 15-16: Buffer & fixes
```

### Phase 3: Intelligence Artificielle (2 mois)
```
Mois 5:
└─ Semaines 17-20: P7 (Détection Prises)

Mois 6:
└─ Semaines 21-24: P8 (Analyse Mouvement)
```

**Total: ~6 mois pour application complète**

---

## 🔄 Workflow par Projet

### 1. Planification (Jour 1-2)
- [ ] Kickoff meeting
- [ ] Clarification requirements
- [ ] Breakdown tâches (tickets)
- [ ] Estimation effort
- [ ] Assignment équipe

### 2. Développement (Jours 3-8)
- [ ] Setup branches Git
- [ ] Développement en parallèle
- [ ] Daily standups
- [ ] Code reviews
- [ ] Tests unitaires

### 3. Intégration (Jours 9-10)
- [ ] Merge branches
- [ ] Tests d'intégration
- [ ] Fix bugs
- [ ] Documentation

### 4. Review & Demo (Jour 11-12)
- [ ] Demo aux stakeholders
- [ ] Feedback collecte
- [ ] Ajustements mineurs
- [ ] Merge vers main

### 5. Déploiement (Jour 13-14)
- [ ] Deploy staging
- [ ] QA staging
- [ ] Deploy production
- [ ] Monitoring post-deploy
- [ ] Rétrospective projet

---

## 📋 Checklist Générale par Projet

### Avant de commencer
- [ ] Dépendances techniques satisfaites
- [ ] Équipe assignée et disponible
- [ ] Requirements clarifiés
- [ ] User stories rédigées
- [ ] Maquettes approuvées (si UI)
- [ ] Branch créée depuis main

### Pendant développement
- [ ] Code reviews quotidiens
- [ ] Tests écrits avec le code
- [ ] Documentation inline
- [ ] Commits atomiques et clairs
- [ ] Pas de code commented out
- [ ] Pas de console.log en production

### Avant merge
- [ ] Tous les tests passent
- [ ] Coverage > 80%
- [ ] Linting pass (0 errors)
- [ ] Build production réussi
- [ ] Documentation à jour
- [ ] Changelog mis à jour
- [ ] Demo fonctionnelle

### Après déploiement
- [ ] Health checks OK
- [ ] Monitoring actif
- [ ] Pas d'erreurs Sentry
- [ ] Performance acceptable
- [ ] Feedback utilisateurs collecté

---

## 🎯 Métriques de Succès Globales

### Technique
- ✅ Uptime > 99.5%
- ✅ Temps réponse API < 200ms (P95)
- ✅ Lighthouse score > 90
- ✅ Test coverage > 80%
- ✅ Zero erreurs critiques

### Business
- ✅ 100+ utilisateurs actifs (fin Phase 1)
- ✅ 500+ voies créées (fin Phase 1)
- ✅ 1000+ validations (fin Phase 2)
- ✅ Taux rétention J7 > 40%
- ✅ NPS > 50

### Expérience
- ✅ Temps création voie < 3 min
- ✅ Temps chargement page < 2s
- ✅ 0 bugs bloquants
- ✅ Feedback positif > 80%

---

## 🚀 Prochaines Étapes

1. **Valider ce plan** avec l'équipe et stakeholders
2. **Prioriser** les projets selon business needs
3. **Constituer les équipes** pour P1
4. **Lancer P1** dès que possible
5. **Itérer** sur base des learnings

---

*Ce plan est vivant et doit être adapté selon les retours et contraintes.*

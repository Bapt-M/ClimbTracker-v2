# ClimbTracker v2 - Plan de Développement

## Stack Technique

### Monorepo
- **pnpm** - Gestionnaire de packages
- **Turborepo** - Build system et orchestration

### Frontend (`apps/web`)
- **React 18** - Framework UI
- **Vite** - Build tool et dev server
- **TailwindCSS** - Styling utility-first
- **Radix UI** - Composants accessibles (Dialog, Select, Tabs, Toast, etc.)
- **React Router DOM** - Routing
- **React Query (TanStack)** - Gestion du cache et état serveur
- **React Hook Form + Zod** - Formulaires et validation
- **Lucide React** - Icônes

### Backend (`apps/api`)
- **Hono.js** - Framework web ultra-rapide
- **Node.js** - Runtime
- **Zod** - Validation des schémas

### Base de données (`packages/database`)
- **PostgreSQL** - Base de données (via Supabase)
- **Drizzle ORM** - ORM type-safe
- **Drizzle Kit** - Migrations

### Authentification (`packages/auth`)
- **Better Auth** - Système d'authentification

### Paiements (`packages/payments`)
- **Stripe** - Traitement des paiements

### Tests
- **Selenium WebDriver** - Tests E2E (Python/pytest)

---

## Fonctionnalités

### Phase 1 - Core MVP

#### Authentification
- [x] Inscription utilisateur
- [x] Connexion utilisateur
- [x] Déconnexion
- [x] Gestion des sessions (Better Auth)
- [x] Rôles utilisateur (USER, OPENER, ADMIN)

#### Gestion des Voies (Routes)
- [x] Liste des voies avec pagination
- [x] Filtres multiples (difficulté, couleur, secteur, statut, date)
- [x] Recherche textuelle
- [x] Vue liste / Vue grille
- [x] Création de voie (OPENER/ADMIN)
- [x] Modification de voie
- [x] Archivage de voie (ADMIN)
- [x] Suppression de voie (ADMIN)
- [x] Sélecteur de secteur (plan de salle)
- [x] Sélecteur de couleur de prise sur image
- [x] Upload de photo principale
- [x] Types de voie (dalle, dévers, etc.)

#### Système de Validation
- [x] Validation rapide (bouton sur carte)
- [x] Menu de validation détaillé (appui long)
- [x] Statuts: VALIDE, EN_PROJET
- [x] Nombre de tentatives
- [x] Flash (première tentative)
- [x] Favoris
- [x] Dé-validation
- [x] Optimistic updates pour UX fluide

#### Détails de Voie
- [x] Page détaillée avec toutes les infos
- [x] Historique des validations
- [x] Nombre de complétions
- [x] Modal d'édition

#### Commentaires
- [x] Liste des commentaires par voie
- [x] Ajout de commentaire
- [x] Affichage utilisateur avec avatar

---

### Phase 2 - Social & Gamification

#### Profil Utilisateur
- [x] Page de profil
- [x] Édition du profil (nom, bio, photo)
- [x] Upload de photo de profil
- [x] Statistiques personnelles
- [x] Graphique Kiviat (radar chart)
- [x] Historique des validations

#### Système d'Amis
- [x] Liste d'amis
- [x] Recherche d'utilisateurs
- [x] Envoi de demande d'ami
- [x] Acceptation/Refus de demande
- [x] Demandes en attente

#### Classement (Leaderboard)
- [x] Classement global
- [x] Top 3 mis en avant
- [x] Carte utilisateur courant avec son rang
- [x] Filtres par période
- [x] Modal détails validation utilisateur

---

### Phase 3 - Administration

#### Panel Admin
- [x] Gestion des voies (approbation PENDING → ACTIVE)
- [x] Gestion du statut des voies
- [ ] Gestion des utilisateurs
- [ ] Statistiques globales de la salle

#### Gestion du Plan de Salle
- [x] Configuration du layout de la salle
- [x] Secteurs interactifs
- [x] Mini-layout sur les cartes de voie

---

### Phase 4 - Médias & Upload

#### Système d'Upload
- [x] Upload local (développement)
- [x] Serveur de fichiers statiques
- [x] Photos de profil
- [x] Photos de voie
- [ ] Intégration Supabase Storage (production)
- [ ] Vidéos d'ouverture

#### Proxy d'Images
- [x] Endpoint proxy pour images externes
- [x] Color picker sur image

---

### Phase 5 - Qualité & Tests

#### Tests E2E (Selenium)
- [x] Infrastructure de test (venv Python, pytest)
- [x] Script runner (`pnpm test:e2e`)
- [x] Tests parcours admin complet
- [x] Tests parcours utilisateur lambda
- [x] Mode headless
- [x] Génération de rapports

#### Qualité de Code
- [x] Tests unitaires frontend (Vitest) - 13 tests
- [x] Tests unitaires backend (Vitest) - 7 tests
- [x] CI/CD Pipeline (GitHub Actions)
- [x] Linting strict (ESLint)
- [x] Lazy loading des pages (React.lazy)
- [x] Memoization des composants (React.memo)

---

### Phase 6 - Fonctionnalités Avancées

#### Analytics (`packages/analytics`)
- [x] Tracking des événements utilisateur
- [x] Intégration frontend/backend
- [ ] Dashboard analytics admin

#### Paiements (`packages/payments`)
- [x] Intégration Stripe complète
- [x] Abonnements premium (checkout, webhooks, portal)
- [x] Page pricing
- [ ] Gestion des factures

#### Notifications
- [x] Notifications in-app
- [x] Composant NotificationBell
- [ ] Notifications push
- [ ] Email transactionnel

#### PWA & Mobile
- [x] Service Worker
- [x] Manifest.json
- [x] Installation sur l'écran d'accueil
- [x] Mode hors ligne basique
- [ ] App native (React Native / Expo)

#### IA & Analyse (À venir)
- [ ] Analyse vidéo des mouvements
- [ ] Suggestions de voies personnalisées
- [ ] Détection automatique de difficulté

---

## Structure du Projet

```
climbtracker-v2/
├── apps/
│   ├── api/                 # Backend Hono.js
│   │   ├── src/
│   │   │   ├── routes/      # Endpoints API
│   │   │   ├── middleware/  # Auth middleware
│   │   │   └── lib/         # Utilitaires
│   │   └── package.json
│   └── web/                 # Frontend React
│       ├── src/
│       │   ├── pages/       # Pages/Routes
│       │   ├── components/  # Composants réutilisables
│       │   ├── hooks/       # Custom hooks
│       │   └── lib/         # API client, utils
│       └── package.json
├── packages/
│   ├── database/            # Drizzle ORM schemas
│   ├── auth/                # Better Auth config
│   ├── ui/                  # Composants UI partagés
│   ├── analytics/           # Module analytics (stub)
│   └── payments/            # Module Stripe (stub)
├── e2e/                     # Tests Selenium
├── scripts/                 # Scripts utilitaires
├── uploads/                 # Fichiers uploadés (dev)
└── package.json             # Root package
```

---

## Commandes Utiles

```bash
# Développement
pnpm dev                    # Lance API + Web en parallèle
pnpm db:studio              # Drizzle Studio (visualiser DB)
pnpm db:push                # Push schema vers DB

# Tests
pnpm test:e2e               # Tests E2E (défaut)
pnpm test:e2e:full          # Tests complets
pnpm test:e2e:headless      # Tests sans navigateur visible

# Build
pnpm build                  # Build tous les packages
```

---

## Prochaines Priorités

1. **Stabilité** - Corriger les bugs de validation/dé-validation
2. **Upload Production** - Intégrer Supabase Storage
3. **Tests Unitaires** - Couverture de code
4. **Gestion Utilisateurs Admin** - Panel complet
5. **Notifications** - Système de notifications temps réel

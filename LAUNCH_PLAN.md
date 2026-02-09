# Plan de Lancement - Notifications & App Native

## 1. Installation des dépendances

```bash
# À la racine du projet
pnpm install
```

## 2. Configuration des variables d'environnement

Ajouter dans `.env` :

```env
# SendGrid (Email)
SENDGRID_API_KEY="SG.xxxxx"
SENDGRID_FROM_EMAIL="notifications@climbtracker.app"

# Web Push (VAPID) - Générer avec: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY="BPxxxxxx"
VAPID_PRIVATE_KEY="xxxxxx"
VAPID_SUBJECT="mailto:contact@climbtracker.app"

# Firebase (FCM pour iOS/Android)
FIREBASE_PROJECT_ID="climbtracker-xxxxx"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@climbtracker-xxxxx.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----"
```

### Générer les clés VAPID
```bash
npx web-push generate-vapid-keys
```

## 3. Migration de la base de données

```bash
# Générer la migration
pnpm --filter @climbtracker/database db:generate

# Appliquer la migration (ou push direct)
pnpm --filter @climbtracker/database db:push
```

## 4. Build des packages

```bash
# Build tous les packages
pnpm build

# Ou individuellement
pnpm --filter @climbtracker/notifications build
pnpm --filter @climbtracker/database build
```

## 5. Test en développement

```bash
# Terminal 1 - API
pnpm --filter @climbtracker/api dev

# Terminal 2 - Web
pnpm --filter @climbtracker/web dev
```

Tester les notifications :
1. Aller sur http://localhost:5173/settings/notifications
2. Activer les notifications push
3. Cliquer sur "Envoyer une notification test"

---

## 6. Configuration Capacitor (App Native)

### Initialisation

```bash
cd apps/web

# Ajouter les plateformes (première fois uniquement)
npx cap add ios
npx cap add android
```

### Build et Sync

```bash
# Build web + sync avec native
pnpm --filter @climbtracker/web mobile:build

# Ou séparément
pnpm --filter @climbtracker/web build
pnpm --filter @climbtracker/web cap:sync
```

### Ouvrir dans les IDEs

```bash
# iOS (nécessite macOS + Xcode)
pnpm --filter @climbtracker/web cap:open:ios

# Android (nécessite Android Studio)
pnpm --filter @climbtracker/web cap:open:android
```

---

## 7. Configuration iOS (Xcode)

1. **Ouvrir le projet**
   ```bash
   pnpm --filter @climbtracker/web cap:open:ios
   ```

2. **Signing & Capabilities**
   - Sélectionner l'équipe de développement
   - Activer "Push Notifications" capability
   - Activer "Background Modes" > "Remote notifications"

3. **URL Scheme (Deep Links)**
   - Target > Info > URL Types
   - Ajouter: `climbtracker`

4. **APNs Key**
   - Apple Developer > Keys > Create Key
   - Activer "Apple Push Notifications service (APNs)"
   - Télécharger le fichier .p8
   - Uploader dans Firebase Console > Project Settings > Cloud Messaging

5. **Info.plist** (permissions)
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>ClimbTracker utilise la caméra pour prendre des photos de tes voies</string>
   <key>NSPhotoLibraryUsageDescription</key>
   <string>ClimbTracker accède à ta galerie pour sélectionner des photos</string>
   ```

6. **Build & Run**
   - Sélectionner un simulateur ou appareil
   - Cmd + R pour lancer

---

## 8. Configuration Android (Android Studio)

1. **Ouvrir le projet**
   ```bash
   pnpm --filter @climbtracker/web cap:open:android
   ```

2. **Firebase**
   - Firebase Console > Project Settings > Add Android app
   - Package name: `app.climbtracker.mobile`
   - Télécharger `google-services.json`
   - Placer dans `android/app/google-services.json`

3. **Deep Links** (déjà configuré dans AndroidManifest.xml)
   ```xml
   <intent-filter>
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="climbtracker" />
   </intent-filter>
   ```

4. **Permissions** (déjà configurées)
   - INTERNET
   - CAMERA
   - VIBRATE
   - POST_NOTIFICATIONS (Android 13+)

5. **Build & Run**
   - Sync Gradle
   - Sélectionner un émulateur ou appareil
   - Run (Shift + F10)

---

## 9. Tests de validation

### Notifications
- [ ] Email SendGrid reçu (vérifier spam)
- [ ] Web Push sur Chrome/Firefox/Safari/Edge
- [ ] FCM push sur iOS (foreground/background/killed)
- [ ] FCM push sur Android (foreground/background/killed)
- [ ] Toggle préférences fonctionne
- [ ] Désabonnement fonctionne

### App Native
- [ ] Build iOS simulator
- [ ] Build Android emulator
- [ ] OAuth Google via deep link
- [ ] OAuth Apple via deep link (iOS uniquement)
- [ ] Capture photo avec caméra native
- [ ] Sélection photo depuis galerie
- [ ] Navigation deep links (`climbtracker://routes/123`)
- [ ] Notifications push natives

---

## 10. Déploiement Production

### Backend
```bash
# Build
pnpm build

# Déployer sur votre hébergeur (Railway, Render, etc.)
```

### Web
```bash
pnpm --filter @climbtracker/web build
# Déployer le dossier dist/ sur Vercel, Netlify, etc.
```

### iOS
1. Xcode > Product > Archive
2. Distribute App > App Store Connect
3. Soumettre pour review

### Android
1. Android Studio > Build > Generate Signed Bundle
2. Upload sur Google Play Console
3. Soumettre pour review

---

## Commandes utiles

```bash
# Développement
pnpm dev                                    # Lancer tout en dev
pnpm --filter @climbtracker/api dev         # API seule
pnpm --filter @climbtracker/web dev         # Web seul

# Build
pnpm build                                  # Build tout
pnpm --filter @climbtracker/web mobile:build # Build + sync mobile

# Database
pnpm --filter @climbtracker/database studio  # Drizzle Studio
pnpm --filter @climbtracker/database db:push # Push schema

# Capacitor
pnpm --filter @climbtracker/web cap:sync     # Sync après changements
pnpm --filter @climbtracker/web cap:open:ios
pnpm --filter @climbtracker/web cap:open:android

# Tests
pnpm test                                   # Lancer les tests
pnpm lint                                   # Linter
```

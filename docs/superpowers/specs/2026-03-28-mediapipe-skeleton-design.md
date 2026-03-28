# MediaPipe Skeleton Detection — Design Spec

## Goal

Afficher le squelette du grimpeur en temps réel sur la vidéo dans `AnalysisResults`, et présenter 3 métriques biomécaniques calculées à partir des keypoints MediaPipe.

## Contexte

L'application dispose d'un flow d'analyse vidéo existant :
- Upload vidéo → Cloudinary → extraction 5 frames → Claude Vision → scores + suggestions
- `AnalysisResults.tsx` affiche les scores Claude (globalScore, 5 dimensions, suggestions, highlights)
- `poseData` existe déjà en base (JSONB vide actuellement)

Cette feature est **100% frontend** — à l'exception d'un ajout mineur côté API pour exposer l'URL vidéo. La vidéo Cloudinary est stockée mais son URL n'est pas encore retournée dans `GET /api/analysis/:id`.

## Stack

- `@mediapipe/tasks-vision` (npm, `apps/web`)
- Modèle `pose_landmarker_lite.task` — chargé depuis CDN Google au premier rendu
- SVG natif pour les graphiques (pas de lib externe)
- React hooks pour l'accumulation des métriques

---

## Changement backend requis

### `apps/api/src/routes/analyses.ts` — `GET /api/analysis/:id`

Ajouter `url: true` dans les colonnes video de la query Drizzle :

```ts
video: {
  columns: { id: true, url: true, thumbnailUrl: true, uploadedAt: true },
},
```

### `apps/web/src/lib/api/index.ts` — type `Analysis`

Ajouter `url` dans le type `video` :

```ts
video?: { id: string; url: string; thumbnailUrl: string; uploadedAt: string };
```

---

## Architecture

```
AnalysisResults.tsx
  ├── [existant] Score global + détails Claude
  └── [nouveau] Section "Analyse de mouvement"
        ├── PoseAnalysisPlayer.tsx
        │     ├── <video> src=analysis.video.url crossOrigin="anonymous"
        │     ├── <canvas> overlay absolu (même dimensions)
        │     └── PoseLandmarker (MediaPipe lite)
        │           → detectForVideo() à chaque frame via requestAnimationFrame
        │           → dessine squelette sur canvas
        │           → émet landmarks[] via callback onLandmarks
        │
        ├── usePoseMetrics(onLandmarks callback)
        │     → accumule PoseFrame[] time-series
        │     → calcule angles coude/genou/hanche (G+D)
        │     → calcule CDG (centre de gravité normalisé)
        │     → calcule balance bras/jambes
        │
        └── PoseMetricsCharts.tsx
              ├── Graphique 1 : angles articulaires (multi-lignes)
              ├── Graphique 2 : trajectoire CDG
              └── Graphique 3 : ratio balance bras/jambes
```

---

## Fichiers

### Créés

| Fichier | Rôle |
|---|---|
| `apps/web/src/components/PoseAnalysisPlayer.tsx` | Lecteur vidéo + canvas overlay + MediaPipe |
| `apps/web/src/hooks/usePoseMetrics.ts` | Accumulation frames + calcul métriques |
| `apps/web/src/components/PoseMetricsCharts.tsx` | 3 graphiques SVG natifs |

### Modifiés

| Fichier | Changement |
|---|---|
| `apps/web/src/pages/AnalysisResults.tsx` | Ajout section "Analyse de mouvement" sous les scores Claude |
| `apps/web/package.json` | Ajout `@mediapipe/tasks-vision` |
| `apps/api/src/routes/analyses.ts` | Expose `url` dans la projection video du GET `/:id` |
| `apps/web/src/lib/api/index.ts` | Ajoute `url: string` dans le type `Analysis.video` |

---

## Composant : PoseAnalysisPlayer

### Props

```tsx
interface PoseAnalysisPlayerProps {
  videoUrl: string;
  onLandmarks: (landmarks: NormalizedLandmark[], timestampMs: number) => void;
}
```

### Comportement

- **Init** : charge `PoseLandmarker` (modèle lite) depuis CDN Google une seule fois ; instance mise en cache module-level
- **Lecture** : loop `requestAnimationFrame` → `detectForVideo(video, timestamp)` → dessine sur canvas → appelle `onLandmarks`
- **Pause / seek** : loop stoppée via ref, reprend à la reprise de lecture
- **Resize** : `ResizeObserver` synchronise les dimensions du canvas avec la vidéo

### Dessin du squelette

- Connexions standard MediaPipe Pose (33 keypoints)
- Couleurs par segment : bras = `#08D9D6` (cyan), jambes = `#2ECC71` (vert), tronc = `#FDFCF0` (cream)
- Keypoints = cercles `r=4` pleins
- Segment masqué si confidence < 0.5 (pas de lignes fantômes)

### États de chargement et d'erreur

- **Chargement** : badge overlay "Chargement du modèle..." pendant le premier chargement
- **Erreur modèle** : si le chargement du modèle échoue, affiche un message d'erreur fixe dans l'overlay et arrête la boucle RAF — l'utilisateur peut recharger la page
- **Erreur CORS / SecurityError** : si `detectForVideo()` lève une `SecurityError` (cross-origin), affiche "Vidéo non accessible (CORS)" avec une note que le lecteur s'appuie sur les URL Cloudinary déjà cross-origin
- Le modèle est mis en cache après la première init (navigation entre pages sans re-téléchargement)

### Nettoyage (unmount)

- La boucle RAF est annulée via `cancelAnimationFrame(rafId.current)`
- `poseLandmarker.close()` est appelé si l'instance n'est pas le cache module-level partagé (ne pas fermer le cache)
- Le `ResizeObserver` est déconnecté via `observer.disconnect()`
- Tout cela dans le `return` du `useEffect` d'initialisation

---

## Hook : usePoseMetrics

### Interface

```tsx
interface PoseFrame {
  t: number;        // timestamp ms
  elbowL: number;   // angle coude gauche (degrés, 0-180)
  elbowR: number;
  kneeL: number;
  kneeR: number;
  hipL: number;     // angle hanche gauche
  hipR: number;
  cog: number;      // centre de gravité 0=bas 1=haut (y inversé)
  armBalance: number; // 0=tout jambes, 1=tout bras
}

// Signature
function usePoseMetrics(): {
  frames: PoseFrame[];
  addFrame: (landmarks: NormalizedLandmark[], t: number) => void;
  reset: () => void;
}
```

### Calculs

**Angle entre 3 keypoints A-B-C :**
```
BA = A - B
BC = C - B
angle = arccos(dot(BA, BC) / (|BA| * |BC|)) × (180/π)
```

Keypoints utilisés :
- Coude G : shoulder_L (11) – elbow_L (13) – wrist_L (15)
- Coude D : shoulder_R (12) – elbow_R (14) – wrist_R (16)
- Genou G : hip_L (23) – knee_L (25) – ankle_L (27)
- Genou D : hip_R (24) – knee_R (26) – ankle_R (28)
- Hanche G : shoulder_L (11) – hip_L (23) – knee_L (25)
- Hanche D : shoulder_R (12) – hip_R (24) – knee_R (26)

**Centre de gravité :**
```
cog = 1 - ((hip_L.y + hip_R.y) / 2)
```
(inversé car y=0 en haut dans MediaPipe, on veut 0=bas 1=haut)

**Balance bras/jambes :**
- `velUpper` = vélocité frame-to-frame moyenne de {épaules, coudes, poignets}
- `velLower` = vélocité frame-to-frame moyenne de {hanches, genoux, chevilles}
- `ε = 1e-6` (constante définie dans le hook)
- `armBalance = velUpper / (velUpper + velLower + ε)`
- Si les deux vélocités sont nulles (première frame ou vidéo statique) : `armBalance = 0.5` (position neutre)

**Limites :**
- Max 2000 frames en mémoire (tronque les plus anciennes au-delà)
- `reset()` appelé au seek ou restart vidéo

---

## Composant : PoseMetricsCharts

### Props

```tsx
interface PoseMetricsChartsProps {
  frames: PoseFrame[];
  currentT: number; // timestamp courant → ligne verticale de position
}
```

### Graphique 1 — Angles articulaires

- Axes : temps (x), degrés 0-180 (y)
- 6 lignes polyline SVG :
  - Coude G/D (cyan clair/foncé)
  - Genou G/D (vert clair/foncé)
  - Hanche G/D (orange clair/foncé)
- Ligne verticale rouge = position actuelle dans la vidéo
- Légende inline (petits carrés de couleur + labels)
- Hauteur : `h-48` (6 lignes + légende nécessitent plus d'espace que `h-32`)

### Graphique 2 — Centre de gravité

- Axe y : 0 (bas) → 1 (haut)
- Courbe lissée (moyenne glissante 5 frames)
- Zone `fill` sous la courbe en dégradé bleu semi-transparent
- Hauteur : `h-32`
- Indique la progression verticale du grimpeur

### Graphique 3 — Balance bras/jambes

- Courbe 0-1
- Zone rouge semi-transparente pour valeurs > 0.6 (trop de bras)
- Zone verte semi-transparente pour valeurs < 0.4 (bonne utilisation jambes)
- Zone neutre 0.4-0.6 en gris clair
- Label "Sur-utilisation bras" / "Bonne technique jambes" en overlay
- Hauteur : `h-32`

### Style commun

- Fond `bg-white`, `border-2 border-climb-dark shadow-neo rounded-2xl p-4`
- Titre `text-sm font-extrabold text-climb-dark`

---

## Intégration dans AnalysisResults.tsx

```tsx
// Nouveaux imports
import { PoseAnalysisPlayer } from '../components/PoseAnalysisPlayer';
import { PoseMetricsCharts } from '../components/PoseMetricsCharts';
import { usePoseMetrics } from '../hooks/usePoseMetrics';

// Dans le composant
const { frames, addFrame, reset } = usePoseMetrics();
const [currentT, setCurrentT] = useState(0);

const handleLandmarks = (landmarks: NormalizedLandmark[], t: number) => {
  addFrame(landmarks, t);
  setCurrentT(t);
};
```

**Ajout dans le JSX** (sous les scores Claude) :
```tsx
{analysis.video?.url && (
  <div className="neo-card p-5">
    <h2>Analyse de mouvement</h2>
    <PoseAnalysisPlayer
      videoUrl={analysis.video.url}
      onLandmarks={handleLandmarks}
    />
    {frames.length === 0 && (
      <p className="text-sm text-climb-dark/50 text-center py-4">
        Lance la vidéo pour voir l'analyse de mouvement
      </p>
    )}
    {frames.length > 10 && (
      <PoseMetricsCharts frames={frames} currentT={currentT} />
    )}
  </div>
)}
```

**Seek handler** : `<video onSeeked={reset} />` via ref passée à PoseAnalysisPlayer.

---

## Ce qui ne change pas

- `poseData` reste vide (feature future)
- Flow d'upload `AnalyzeVideo.tsx` inchangé
- Scores Claude et affichage existant inchangés

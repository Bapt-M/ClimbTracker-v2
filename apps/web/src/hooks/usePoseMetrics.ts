import { useState, useCallback, useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { angleDeg, computeArmBalance, type Landmark } from '../lib/pose-math';

export interface PoseFrame {
  t: number;           // performance.now() ms — used internally by MediaPipe
  videoTime: number;   // video.currentTime in seconds — used for chart X axis
  elbowL: number;
  elbowR: number;
  kneeL: number;
  kneeR: number;
  hipL: number;
  hipR: number;
  cog: number;
  armBalance: number;
}

const MAX_FRAMES = 2000;

export function usePoseMetrics() {
  const [frames, setFrames] = useState<PoseFrame[]>([]);
  const prevLandmarksRef = useRef<Landmark[] | null>(null);

  const addFrame = useCallback((landmarks: NormalizedLandmark[], t: number, videoTime: number) => {
    const lm = landmarks as Landmark[];

    const frame: PoseFrame = {
      t,
      videoTime,
      // Elbows: shoulder – elbow – wrist
      elbowL: angleDeg(lm[11], lm[13], lm[15]),
      elbowR: angleDeg(lm[12], lm[14], lm[16]),
      // Knees: hip – knee – ankle
      kneeL: angleDeg(lm[23], lm[25], lm[27]),
      kneeR: angleDeg(lm[24], lm[26], lm[28]),
      // Hips: shoulder – hip – knee
      hipL: angleDeg(lm[11], lm[23], lm[25]),
      hipR: angleDeg(lm[12], lm[24], lm[26]),
      // CoG: 1 - avg hip y (y=0 is top in MediaPipe, we want 0=bottom)
      cog: 1 - (lm[23].y + lm[24].y) / 2,
      armBalance: computeArmBalance(prevLandmarksRef.current, lm),
    };

    prevLandmarksRef.current = landmarks.map(l => ({ ...l }));

    setFrames(prev => {
      const next = [...prev, frame];
      return next.length > MAX_FRAMES ? next.slice(next.length - MAX_FRAMES) : next;
    });
  }, []);

  const reset = useCallback(() => {
    setFrames([]);
    prevLandmarksRef.current = null;
  }, []);

  return { frames, addFrame, reset };
}

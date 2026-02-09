import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.climbtracker.mobile',
  appName: 'ClimbTracker',
  webDir: 'dist',
  server: {
    // For development, you can use a local server
    // url: 'http://localhost:5173',
    // cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FDFCF0',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#FDFCF0',
    },
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'climbtracker',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;

// Platform detection
export {
  isNative,
  isIOS,
  isAndroid,
  isWeb,
  getPlatform,
  isPluginAvailable,
  getDeviceInfo,
} from './platform';

// Push notifications (FCM for native)
export {
  initPushNotifications,
  getDeliveredNotifications,
  removeAllDeliveredNotifications,
  setOnNotificationReceived,
  setOnNotificationTapped,
  setOnTokenReceived,
  unregisterPush,
} from './push';

// Camera
export {
  capturePhoto,
  captureFromCamera,
  pickFromGallery,
  dataUrlToBlob,
  checkCameraPermissions,
  requestCameraPermissions,
  type CapturedImage,
} from './camera';

// Auth / Deep linking
export {
  initDeepLinks,
  startOAuth,
  closeBrowser,
  openExternalUrl,
  getOAuthCallbackUrl,
  isAppDeepLink,
  parseDeepLink,
  removeDeepLinkListener,
} from './auth';

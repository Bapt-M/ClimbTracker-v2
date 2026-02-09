// Types
export * from './types';

// SendGrid (Email)
export {
  initSendGrid,
  isSendGridReady,
  sendEmail,
} from './sendgrid';

// Web Push (VAPID)
export {
  initWebPush,
  isWebPushReady,
  getVapidPublicKey,
  sendWebPush,
  sendWebPushBatch,
  generateVapidKeys,
} from './web-push';

// Firebase Cloud Messaging
export {
  initFCM,
  isFCMReady,
  sendFCM,
  sendFCMBatch,
  verifyFCMToken,
} from './fcm';

// Dispatcher (unified interface)
export {
  initDispatcher,
  notify,
  notifyMany,
  sendTestNotification,
  type NotificationUser,
  type NotificationDatabase,
} from './dispatcher';

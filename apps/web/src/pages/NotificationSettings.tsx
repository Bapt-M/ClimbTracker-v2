import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { BottomNav } from '../components/BottomNav';
import { usePushNotifications } from '../hooks/usePushNotifications';
import {
  pushSubscriptionsAPI,
  notificationPreferencesAPI,
  type PushSubscription,
  type NotificationPreferences,
} from '../lib/api';
import { ArrowLeft, Bell, Mail, Smartphone, Monitor, Trash2, Send, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

type NotificationType = keyof NotificationPreferences['email'];

const NOTIFICATION_TYPES: { key: NotificationType; label: string; description: string }[] = [
  { key: 'friendRequest', label: 'Demandes d\'ami', description: 'Quand quelqu\'un veut devenir ton ami' },
  { key: 'friendAccepted', label: 'Ami accepte', description: 'Quand quelqu\'un accepte ta demande' },
  { key: 'commentReceived', label: 'Commentaires', description: 'Quand quelqu\'un commente ta voie' },
  { key: 'routeCreated', label: 'Nouvelles voies', description: 'Quand une nouvelle voie est ouverte' },
  { key: 'achievementUnlocked', label: 'Succes', description: 'Quand tu debloques un succes' },
  { key: 'system', label: 'Systeme', description: 'Mises a jour et annonces importantes' },
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { toast } = useToast();
  const pushNotifications = usePushNotifications();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [devices, setDevices] = useState<PushSubscription[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prefsData, devicesList] = await Promise.all([
        notificationPreferencesAPI.get(),
        pushSubscriptionsAPI.getSubscriptions(),
      ]);

      setEmailEnabled(prefsData.emailNotifications);
      setPushEnabled(prefsData.pushNotifications);
      setPreferences(prefsData.preferences);
      setDevices(devicesList);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les parametres',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (
    newEmailEnabled?: boolean,
    newPushEnabled?: boolean,
    newPreferences?: NotificationPreferences
  ) => {
    setSaving(true);
    try {
      await notificationPreferencesAPI.update({
        emailNotifications: newEmailEnabled ?? emailEnabled,
        pushNotifications: newPushEnabled ?? pushEnabled,
        preferences: newPreferences ?? preferences ?? undefined,
      });
      toast({
        title: 'Enregistre',
        description: 'Tes preferences ont ete mises a jour',
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEmailToggle = async () => {
    const newValue = !emailEnabled;
    setEmailEnabled(newValue);
    await savePreferences(newValue, undefined, undefined);
  };

  const handlePushToggle = async () => {
    const newValue = !pushEnabled;
    setPushEnabled(newValue);
    await savePreferences(undefined, newValue, undefined);
  };

  const handlePreferenceToggle = async (type: NotificationType, channel: 'email' | 'push') => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      [channel]: {
        ...preferences[channel],
        [type]: !preferences[channel][type],
      },
    };

    setPreferences(newPreferences);
    await savePreferences(undefined, undefined, newPreferences);
  };

  const handleSubscribePush = async () => {
    const success = await pushNotifications.subscribe();
    if (success) {
      toast({
        title: 'Active',
        description: 'Les notifications push sont activees',
      });
      loadData(); // Refresh devices list
    } else {
      toast({
        title: 'Erreur',
        description: pushNotifications.error || 'Impossible d\'activer les notifications',
        variant: 'destructive',
      });
    }
  };

  const handleUnsubscribeDevice = async (deviceId: string) => {
    try {
      await pushSubscriptionsAPI.unsubscribe(deviceId);
      setDevices(devices.filter((d) => d.id !== deviceId));
      toast({
        title: 'Supprime',
        description: 'L\'appareil a ete supprime',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'appareil',
        variant: 'destructive',
      });
    }
  };

  const handleSendTest = async () => {
    setTestLoading(true);
    try {
      const success = await pushSubscriptionsAPI.sendTest('all');
      if (success) {
        toast({
          title: 'Envoye',
          description: 'Une notification test a ete envoyee',
        });
      } else {
        toast({
          title: 'Erreur',
          description: 'Aucune notification envoyee. Verifie tes abonnements.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la notification test',
        variant: 'destructive',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const getDeviceIcon = (platform: string) => {
    switch (platform) {
      case 'ios':
      case 'android':
        return <Smartphone className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-hold-pink" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-cream border-b border-climb-dark/10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-climb-dark/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Global toggles */}
        <section className="bg-white rounded-2xl p-4 space-y-4">
          <h2 className="font-semibold text-climb-dark">Canaux de notification</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-climb-dark/60" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-climb-dark/60">Recevoir par email</p>
              </div>
            </div>
            <button
              onClick={handleEmailToggle}
              disabled={saving}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                emailEnabled ? 'bg-hold-pink' : 'bg-climb-dark/20'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  emailEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-climb-dark/60" />
              <div>
                <p className="font-medium">Push</p>
                <p className="text-sm text-climb-dark/60">Notifications en temps reel</p>
              </div>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={saving}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                pushEnabled ? 'bg-hold-pink' : 'bg-climb-dark/20'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  pushEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Push subscription */}
        {pushNotifications.isSupported && (
          <section className="bg-white rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-climb-dark">Notifications Push</h2>

            {pushNotifications.permission === 'denied' ? (
              <p className="text-sm text-red-500">
                Les notifications sont bloquees. Active-les dans les parametres de ton navigateur.
              </p>
            ) : !pushNotifications.isSubscribed ? (
              <button
                onClick={handleSubscribePush}
                disabled={pushNotifications.isLoading}
                className="w-full py-3 bg-hold-pink text-white rounded-xl font-semibold hover:bg-hold-pink/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pushNotifications.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
                Activer sur cet appareil
              </button>
            ) : (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications actives sur cet appareil
              </p>
            )}
          </section>
        )}

        {/* Devices list */}
        {devices.length > 0 && (
          <section className="bg-white rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-climb-dark">Appareils abonnes</h2>

            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-cream rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device.platform)}
                    <div>
                      <p className="font-medium">{device.deviceName || device.platform}</p>
                      <p className="text-xs text-climb-dark/60">
                        {new Date(device.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnsubscribeDevice(device.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notification types */}
        {preferences && (
          <section className="bg-white rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-climb-dark">Types de notifications</h2>

            <div className="space-y-4">
              {NOTIFICATION_TYPES.map(({ key, label, description }) => (
                <div key={key} className="space-y-2">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-climb-dark/60">{description}</p>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.email[key]}
                        onChange={() => handlePreferenceToggle(key, 'email')}
                        disabled={!emailEnabled || saving}
                        className="w-4 h-4 rounded border-climb-dark/30 text-hold-pink focus:ring-hold-pink disabled:opacity-50"
                      />
                      <span className="text-sm">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.push[key]}
                        onChange={() => handlePreferenceToggle(key, 'push')}
                        disabled={!pushEnabled || saving}
                        className="w-4 h-4 rounded border-climb-dark/30 text-hold-pink focus:ring-hold-pink disabled:opacity-50"
                      />
                      <span className="text-sm">Push</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Test notification */}
        <section className="bg-white rounded-2xl p-4">
          <button
            onClick={handleSendTest}
            disabled={testLoading}
            className="w-full py-3 border-2 border-climb-dark/20 text-climb-dark rounded-xl font-semibold hover:bg-climb-dark/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {testLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            Envoyer une notification test
          </button>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

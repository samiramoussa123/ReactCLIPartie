

import notifee, {
  AndroidImportance,
  AndroidVisibility,
  EventType,
  TriggerType,
} from '@notifee/react-native';

export const CHANNEL = {
  URGENT:   'rdv_urgent',
  REMINDER: 'rdv_reminder',
  GENERAL:  'general',
};

export async function initNotifications() {
  await notifee.requestPermission();

  await notifee.createChannel({
    id:         CHANNEL.URGENT,
    name:       'Rendez-vous imminent',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration:  true,
    sound:      'default',
  });

  await notifee.createChannel({
    id:         CHANNEL.REMINDER,
    name:       'Rappels rendez-vous',
    importance: AndroidImportance.DEFAULT,
    visibility: AndroidVisibility.PRIVATE,
    sound:      'default',
  });

  await notifee.createChannel({
    id:         CHANNEL.GENERAL,
    name:       'Général',
    importance: AndroidImportance.DEFAULT,
    visibility: AndroidVisibility.PRIVATE,
  });

  console.log('Canaux de notifications créés');
}

export async function showNotification({ id, title, body, channelId = CHANNEL.GENERAL, data = {} }) {
  try {
    await notifee.displayNotification({
      id:      String(id),
      title,
      body,
      data,
      android: {
        channelId,
        smallIcon:    'ic_notification', // doit exister dans res/drawable
        importance:   channelId === CHANNEL.URGENT
                        ? AndroidImportance.HIGH
                        : AndroidImportance.DEFAULT,
        pressAction:  { id: 'default' },
        // Heads-up (bannière) pour les urgences
        ...(channelId === CHANNEL.URGENT && {
          fullScreenAction: { id: 'default' },
        }),
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
    });
  } catch (error) {
    console.error('Erreur affichage notification:', error);
  }
}

// ─────────────────────────────────
// 3. Notification urgente (heads-up = s'affiche par-dessus l'écran)
// ─────────────────────────────────
export async function showUrgentNotification({ id, title, body, data = {} }) {
  return showNotification({ id, title, body, channelId: CHANNEL.URGENT, data });
}

// ─────────────────────────────────
// 4. Notification programmée à une heure précise
// ─────────────────────────────────
export async function scheduleNotification({ id, title, body, timestamp, channelId = CHANNEL.REMINDER, data = {} }) {
  try {
    await notifee.createTriggerNotification(
      {
        id:      String(id),
        title,
        body,
        data,
        android: { channelId, smallIcon: 'ic_notification', pressAction: { id: 'default' } },
        ios:     { sound: 'default' },
      },
      {
        type:      TriggerType.TIMESTAMP,
        timestamp, // Date.now() + délai en ms
      }
    );
  } catch (error) {
    console.error('Erreur notification programmée:', error);
  }
}

// ─────────────────────────────────
// 5. Annule une notification par son ID
// ─────────────────────────────────
export async function cancelNotification(id) {
  try {
    await notifee.cancelNotification(String(id));
  } catch (error) {
    console.error('Erreur annulation notification:', error);
  }
}

// ─────────────────────────────────
// 6. Annule toutes les notifications
// ─────────────────────────────────
export async function cancelAllNotifications() {
  try {
    await notifee.cancelAllNotifications();
  } catch (error) {
    console.error('Erreur annulation toutes notifications:', error);
  }
}

// ─────────────────────────────────
// 7. Écoute les clics sur notification (foreground)
// ─────────────────────────────────
export function onForegroundNotificationEvent(navigation) {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      const screen = detail.notification?.data?.screen;
      if (screen && navigation) {
        navigation.navigate(screen);
      }
    }
  });
}


export function registerBackgroundHandler() {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
      console.log('Notification cliquée en background:', detail.notification?.data);
    }
  });
}
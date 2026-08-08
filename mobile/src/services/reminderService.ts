import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CallbackItem } from '../screens/CallbacksScreen';

/**
 * Reminders for scheduled follow-ups.
 *
 * The app had no notifications at all. POST_NOTIFICATIONS was declared in
 * app.json and nothing ever used it, so a follow-up scheduled for 3pm sat in
 * the database and the agent found out about it only by opening the app and
 * looking.
 *
 * These are *local* notifications, scheduled on the device. That is deliberate:
 * a follow-up reminder needs no server, no FCM project and no push token, and
 * it fires whether or not the phone has a network. Remote push — "a new lead
 * was assigned to you" — is a different job and needs infrastructure that does
 * not exist yet.
 *
 * Written against expo-notifications 0.28 (Expo SDK 51), which is what is
 * installed. The SDK 57 documentation shows `shouldShowBanner`/`shouldShowList`
 * and a `SchedulableTriggerInputTypes` enum; neither exists in this version,
 * where the handler takes `shouldShowAlert` and a date trigger is `{ date }`.
 */

const CHANNEL_ID = 'callbacks';
const SCHEDULED_KEY = 'callmind.reminders.scheduled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** callbackId -> notification identifier, so a changed time can be rescheduled. */
type ScheduledMap = Record<string, string>;

async function readScheduled(): Promise<ScheduledMap> {
  try {
    return JSON.parse((await AsyncStorage.getItem(SCHEDULED_KEY)) || '{}');
  } catch {
    return {};
  }
}

async function writeScheduled(map: ScheduledMap): Promise<void> {
  await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(map));
}

export const reminderService = {
  /**
   * Ask for permission, and create the Android channel.
   *
   * Android 8 and above refuses to show a notification that has no channel, so
   * this has to run before anything is scheduled.
   */
  async setUp(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Follow-up reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted) return true;
      // Do not re-prompt if the user has already said no; Android only asks once.
      if (!existing.canAskAgain) return false;

      const asked = await Notifications.requestPermissionsAsync();
      return asked.granted;
    } catch {
      return false;
    }
  },

  /**
   * Make the device's scheduled reminders match the given follow-ups.
   *
   * Called whenever callbacks are loaded. Reminders for follow-ups that have
   * been completed, moved or deleted are cancelled; new ones are added; ones
   * already scheduled at the same time are left alone, so this is safe to run
   * on every refresh.
   */
  async sync(callbacks: CallbackItem[]): Promise<void> {
    const scheduled = await readScheduled();
    const next: ScheduledMap = {};
    const now = Date.now();

    const wanted = callbacks.filter(
      (cb) => cb.reminderDate && new Date(cb.reminderDate).getTime() > now,
    );

    for (const cb of wanted) {
      // The key carries the time, so moving a follow-up produces a different
      // key and the old reminder is cancelled below rather than firing at the
      // time nobody chose any more.
      const key = `${cb.id}@${cb.reminderDate}`;
      if (scheduled[key]) {
        next[key] = scheduled[key];
        continue;
      }

      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Call ${cb.name}`,
            body: cb.note || 'Follow-up due now.',
            data: { callbackId: cb.id, leadId: cb.leadId ?? null, screen: 'callbacks' },
          },
          trigger: { channelId: CHANNEL_ID, date: new Date(cb.reminderDate!) },
        });
        next[key] = id;
      } catch {
        // One reminder failing to schedule should not stop the rest.
      }
    }

    // Cancel anything no longer wanted.
    for (const [key, id] of Object.entries(scheduled)) {
      if (next[key]) continue;
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // Already fired or already gone.
      }
    }

    await writeScheduled(next);
  },

  /** Drop every reminder. Used on sign-out, so the next user gets none of them. */
  async clearAll(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // Nothing scheduled.
    }
    await AsyncStorage.removeItem(SCHEDULED_KEY);
  },
};

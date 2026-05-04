import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import {
  getNotificationDeliveryLog,
  saveNotificationInboxItems,
  saveNotificationDeliveries,
} from '../database/db';
import { loadNotificationsForUser } from '../notifications/notificationEngine';

// Limits repeated local notification delivery so users are not spammed.
const DELIVERY_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const MAX_NOTIFICATIONS_PER_SYNC = 5;

// References the custom Android module that creates and shows notifications.
const localNotificationModule = NativeModules.LocalNotificationModule;

// Converts callback-style database helpers into promises.
const toPromise = executor =>
  new Promise(resolve => {
    executor(resolve);
  });

// Loads the local delivery log for notification cooldown checks.
const getNotificationDeliveryLogAsync = notificationIds =>
  toPromise(resolve => getNotificationDeliveryLog(notificationIds, resolve));

// Saves delivered notification ids so future syncs can throttle repeats.
const saveNotificationDeliveriesAsync = notificationIds =>
  new Promise(resolve => {
    saveNotificationDeliveries(notificationIds, resolve);
  });

// Stores notification inbox items so they remain visible offline.
const saveNotificationInboxItemsAsync = (userId, items) =>
  new Promise(resolve => {
    saveNotificationInboxItems(userId, items, resolve);
  });

// Checks whether the native Android notification bridge is available.
const canUseLocalNotificationModule = () =>
  Platform.OS === 'android' && localNotificationModule;

// Creates the Android notification channel and requests permission when required.
export const initializeLocalNotifications = async () => {
  if (!canUseLocalNotificationModule()) {
    return false;
  }

  localNotificationModule.createChannel();

  if (Platform.Version < 33) {
    return true;
  }

  const alreadyGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );

  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
};

// Generates reminders, saves them to the inbox, and shows eligible local notifications.
export const syncDeviceNotificationsForUser = async (userId, options = {}) => {
  const { force = false } = options;

  if (!userId || !canUseLocalNotificationModule()) {
    return [];
  }

  const permissionGranted = await initializeLocalNotifications();

  if (!permissionGranted) {
    return [];
  }

  const { notifications } = await loadNotificationsForUser(userId);
  const candidateNotifications = notifications.slice(0, MAX_NOTIFICATIONS_PER_SYNC);

  if (!candidateNotifications.length) {
    return [];
  }

  await saveNotificationInboxItemsAsync(userId, candidateNotifications);

  const deliveryLog = await getNotificationDeliveryLogAsync(candidateNotifications.map(item => item.id));
  const now = Date.now();

  // Filters out notifications recently shown unless a manual refresh forces delivery.
  const deliverableNotifications = force ? candidateNotifications : candidateNotifications.filter(item => {
    const deliveredAt = deliveryLog[item.id];

    if (!deliveredAt) {
      return true;
    }

    const deliveredAtMs = Date.parse(deliveredAt);

    if (Number.isNaN(deliveredAtMs)) {
      return true;
    }

    return now - deliveredAtMs > DELIVERY_COOLDOWN_MS;
  });

  if (!deliverableNotifications.length) {
    return [];
  }

  deliverableNotifications.forEach(item => {
    localNotificationModule.showNotification(
      item.id,
      item.title,
      `${item.detail} ${item.farmName} - ${item.batchLabel}`.trim(),
      Number(userId)
    );
  });

  await saveNotificationInboxItemsAsync(userId, deliverableNotifications);
  await saveNotificationDeliveriesAsync(deliverableNotifications.map(item => item.id));

  return deliverableNotifications;
};

// Consumes a native notification-tap intent so the app can open the reminders tab once.
export const consumePendingNotificationOpen = async () => {
  if (!canUseLocalNotificationModule() || typeof localNotificationModule.consumeNotificationOpen !== 'function') {
    return {
      shouldOpenNotifications: false,
      userId: null,
    };
  }

  try {
    const result = await localNotificationModule.consumeNotificationOpen();

    if (typeof result === 'boolean') {
      return {
        shouldOpenNotifications: result,
        userId: null,
      };
    }

    const userId = Number(result?.userId);

    return {
      shouldOpenNotifications: Boolean(result?.shouldOpenNotifications),
      userId: Number.isFinite(userId) && userId > 0 ? userId : null,
    };
  } catch (error) {
    console.log('Error consuming notification open intent', error);
    return {
      shouldOpenNotifications: false,
      userId: null,
    };
  }
};

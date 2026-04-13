import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import {
  getNotificationDeliveryLog,
  saveNotificationDeliveries,
} from '../database/db';
import { loadNotificationsForUser } from '../notifications/notificationEngine';

const DELIVERY_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const MAX_NOTIFICATIONS_PER_SYNC = 5;

const localNotificationModule = NativeModules.LocalNotificationModule;

const toPromise = executor =>
  new Promise(resolve => {
    executor(resolve);
  });

const getNotificationDeliveryLogAsync = notificationIds =>
  toPromise(resolve => getNotificationDeliveryLog(notificationIds, resolve));

const saveNotificationDeliveriesAsync = notificationIds =>
  new Promise(resolve => {
    saveNotificationDeliveries(notificationIds, resolve);
  });

const canUseLocalNotificationModule = () =>
  Platform.OS === 'android' && localNotificationModule;

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

export const syncDeviceNotificationsForUser = async userId => {
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

  const deliveryLog = await getNotificationDeliveryLogAsync(candidateNotifications.map(item => item.id));
  const now = Date.now();
  const deliverableNotifications = candidateNotifications.filter(item => {
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
      `${item.detail} ${item.farmName} - ${item.batchLabel}`.trim()
    );
  });

  await saveNotificationDeliveriesAsync(deliverableNotifications.map(item => item.id));

  return deliverableNotifications;
};

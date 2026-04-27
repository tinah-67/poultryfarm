import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import { loadNotificationsForUser } from '../notifications/notificationEngine';
import { getNotificationInboxItems } from '../database/db';

const toPromise = executor =>
  new Promise(resolve => {
    executor(resolve);
  });

const getNotificationInboxItemsAsync = userId =>
  toPromise(resolve => getNotificationInboxItems(userId, resolve));

const NotificationCard = ({ label, value }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const NotificationListItem = ({ item, onPress }) => (
  <TouchableOpacity style={styles.notificationRow} activeOpacity={0.85} onPress={onPress}>
    <View style={[styles.avatar, styles[`${item.severity}Avatar`]]}>
      <Text style={styles.avatarText}>F</Text>
    </View>
    <View style={styles.notificationBody}>
      <View style={styles.notificationTopLine}>
        <Text style={styles.notificationSender}>Farm Alerts</Text>
        <Text style={[styles.notificationBadge, styles[`${item.severity}Badge`]]}>
          {item.severity.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.notificationMessage} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.notificationPreview} numberOfLines={2}>{item.detail}</Text>
      <Text style={styles.notificationMeta} numberOfLines={1}>
        {item.type} • {item.batchLabel} • {item.farmName}
      </Text>
    </View>
  </TouchableOpacity>
);

export default function NotificationsScreen({ route, extraBottomPadding = 0 }) {
  const userId = route?.params?.userId;
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);

  const loadNotifications = useCallback(async (done) => {
    try {
      const [
        { user, notifications: liveNotifications },
        inboxNotifications,
      ] = await Promise.all([
        loadNotificationsForUser(userId),
        getNotificationInboxItemsAsync(userId),
      ]);

      const mergedNotifications = [
        ...(liveNotifications || []),
        ...((inboxNotifications || []).filter(
          inboxItem => !(liveNotifications || []).some(liveItem => liveItem.id === inboxItem.id)
        )),
      ];

      setCurrentUser(user);
      setNotifications(mergedNotifications);
    } catch (error) {
      console.log('Error loading notifications', error);
      setCurrentUser(null);
      setNotifications([]);
    } finally {
      done && done();
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications(() => setRefreshing(false));
  };

  const filteredNotifications = useMemo(() => {
    if (selectedSeverity === 'all') {
      return notifications;
    }

    return notifications.filter(item => item.severity === selectedSeverity);
  }, [notifications, selectedSeverity]);

  const summary = {
    total: notifications.length,
    critical: notifications.filter(item => item.severity === 'critical').length,
    warning: notifications.filter(item => item.severity === 'warning').length,
    info: notifications.filter(item => item.severity === 'info').length,
  };

  return (
    <ScreenBackground
      scroll
      contentContainerStyle={[styles.container, extraBottomPadding ? { paddingBottom: extraBottomPadding } : null]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />}
    >
      <Text style={styles.title}>Notifications</Text>
      {currentUser?.role ? (
        <Text style={styles.subtitle}>
          Showing alerts for {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} role
        </Text>
      ) : null}

      <View style={styles.summaryGrid}>
        <NotificationCard label="All Alerts" value={String(summary.total)} />
        <NotificationCard label="Critical" value={String(summary.critical)} />
        <NotificationCard label="Warnings" value={String(summary.warning)} />
        <NotificationCard label="Info" value={String(summary.info)} />
      </View>

      <View style={styles.filterRow}>
        {['all', 'critical', 'warning', 'info'].map(level => {
          const isSelected = selectedSeverity === level;

          return (
            <TouchableOpacity
              key={level}
              style={[styles.filterChip, isSelected ? styles.filterChipSelected : null]}
              activeOpacity={0.85}
              onPress={() => setSelectedSeverity(level)}
            >
              <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextSelected : null]}>
                {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.listPanel}>
        {filteredNotifications.length ? filteredNotifications.map(item => (
          <NotificationListItem
            key={item.id}
            item={item}
            onPress={() => {
              Alert.alert(
                item.title,
                `Priority: ${item.severity.toUpperCase()}\nType: ${item.type}\nBatch: ${item.batchLabel}\nFarm: ${item.farmName}\nLocation: ${item.farmLocation}\n\n${item.detail}`
              );
            }}
          />
        )) : (
          <Text style={styles.emptyText}>No notifications right now.</Text>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    color: '#e2e8f0',
    marginBottom: 16,
  },
  summaryGrid: {
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    padding: 14,
  },
  summaryLabel: {
    color: '#475569',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  filterChipSelected: {
    backgroundColor: '#dcfce7',
  },
  filterChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#166534',
  },
  listPanel: {
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    borderRadius: 18,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  criticalAvatar: {
    backgroundColor: '#fee2e2',
  },
  warningAvatar: {
    backgroundColor: '#fef3c7',
  },
  infoAvatar: {
    backgroundColor: '#dbeafe',
  },
  avatarText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  notificationBody: {
    flex: 1,
  },
  notificationTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  notificationSender: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  notificationBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  criticalBadge: {
    backgroundColor: '#fecaca',
    color: '#991b1b',
  },
  warningBadge: {
    backgroundColor: '#fde68a',
    color: '#92400e',
  },
  infoBadge: {
    backgroundColor: '#bfdbfe',
    color: '#1d4ed8',
  },
  notificationMessage: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  notificationPreview: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 5,
  },
  notificationMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  emptyText: {
    color: '#475569',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
});

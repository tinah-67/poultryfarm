import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import { loadNotificationsForUser } from '../notifications/notificationEngine';
import {
  getNotificationInboxItems,
  markNotificationInboxItemRead,
  saveNotificationInboxItems,
} from '../database/db';

// Converts callback-style database helpers into promises so async/await can be used.
const toPromise = executor =>
  new Promise(resolve => {
    executor(resolve);
  });

// Loads saved reminder messages from the local notification inbox.
const getNotificationInboxItemsAsync = userId =>
  toPromise(resolve => getNotificationInboxItems(userId, resolve));

// Marks one reminder as read in the local notification inbox.
const markNotificationInboxItemReadAsync = notificationId =>
  toPromise(resolve => markNotificationInboxItemRead(notificationId, resolve));

// Persists newly generated reminders so they remain available offline.
const saveNotificationInboxItemsAsync = (userId, items) =>
  toPromise(resolve => saveNotificationInboxItems(userId, items, resolve));

// Defines the allowed reminder priorities and the visible inbox filters.
const VALID_SEVERITIES = ['critical', 'warning', 'info'];
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning', label: 'Warnings' },
  { key: 'info', label: 'Info' },
];

// Ensures each reminder has the fields needed by the inbox UI.
const normalizeMessageItem = item => {
  const severity = VALID_SEVERITIES.includes(item?.severity) ? item.severity : 'info';
  const title = String(item?.title || 'Farm reminder').trim();
  const id = String(item?.id || `${severity}-${title}-${item?.batchId || 'general'}`);

  return {
    ...item,
    id,
    severity,
    title,
    detail: String(item?.detail || 'Open this reminder for details.').trim(),
    type: String(item?.type || 'Reminder').trim(),
    farmName: String(item?.farmName || 'N/A').trim(),
    farmLocation: String(item?.farmLocation || 'N/A').trim(),
    batchLabel: String(item?.batchLabel || 'N/A').trim(),
    deliveredAt: item?.deliveredAt || new Date().toISOString(),
    readAt: item?.readAt || null,
  };
};

// Orders reminder messages with the newest items first.
const sortMessages = items =>
  items.slice().sort((left, right) => {
    const rightTime = Date.parse(right.deliveredAt) || 0;
    const leftTime = Date.parse(left.deliveredAt) || 0;
    return rightTime - leftTime;
  });

// Combines saved inbox messages with newly generated messages and removes duplicates.
const mergeMessages = (inboxMessages = [], liveMessages = []) => {
  const seenIds = new Set();

  return [...inboxMessages, ...liveMessages]
    .map(normalizeMessageItem)
    .filter(item => {
      if (!item.id || seenIds.has(item.id)) {
        return false;
      }

      seenIds.add(item.id);
      return true;
    });
};

// Formats reminder delivery time for compact inbox display.
const formatMessageTime = value => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Builds the small metadata line shown under each reminder preview.
const buildMessageMeta = item =>
  [item.type, item.batchLabel, item.farmName].filter(Boolean).join(' - ');

// Renders one count card in the reminder summary area.
const MessageSummary = ({ label, value }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

// Renders one reminder row with read/unread state and severity styling.
const MessageListItem = ({ item, onPress }) => {
  const isUnread = !item.readAt;

  return (
    <TouchableOpacity
      style={[styles.messageRow, isUnread ? styles.messageRowUnread : null]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.avatar, styles[`${item.severity}Avatar`]]}>
        <Text style={styles.avatarText}>F</Text>
      </View>
      <View style={styles.messageBody}>
        <View style={styles.messageTopLine}>
          <View style={styles.senderRow}>
            {isUnread ? <View style={styles.unreadDot} /> : null}
            <Text style={styles.messageSender}>Farm Alerts</Text>
          </View>
          <Text style={styles.messageTime}>{formatMessageTime(item.deliveredAt)}</Text>
        </View>
        <Text style={[styles.messageTitle, isUnread ? styles.messageTitleUnread : null]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.messagePreview} numberOfLines={2}>{item.detail}</Text>
        <View style={styles.messageMetaRow}>
          <Text style={styles.messageMeta} numberOfLines={1}>{buildMessageMeta(item)}</Text>
          <Text style={[styles.messageBadge, styles[`${item.severity}Badge`]]}>
            {item.severity.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Shows the user's reminder inbox, including local offline messages and fresh generated alerts.
export default function NotificationsScreen({ route, extraBottomPadding = 0 }) {
  // Keeps route data and screen state together for loading, filtering, and refresh UI.
  const userId = route?.params?.userId;
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);

  // Loads fresh reminders, saves them locally, then merges them with the saved inbox.
  const loadMessages = useCallback(async (done) => {
    let liveUser = null;
    let liveMessages = [];

    try {
      const liveResult = await loadNotificationsForUser(userId);
      liveUser = liveResult?.user || null;
      liveMessages = liveResult?.notifications || [];

      if (userId && liveMessages.length) {
        await saveNotificationInboxItemsAsync(userId, liveMessages);
      }
    } catch (error) {
      console.log('Error loading live reminders', error);
    }

    try {
      const inboxMessages = await getNotificationInboxItemsAsync(userId);

      setCurrentUser(liveUser);
      setMessages(sortMessages(mergeMessages(inboxMessages, liveMessages)));
    } catch (error) {
      console.log('Error loading reminder messages', error);
      setCurrentUser(liveUser);
      setMessages(sortMessages(liveMessages.map(normalizeMessageItem)));
    } finally {
      done && done();
    }
  }, [userId]);

  // Refreshes reminders each time the user opens or returns to this screen.
  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  // Handles pull-to-refresh and stops the spinner after loading finishes.
  const handleRefresh = () => {
    setRefreshing(true);
    loadMessages(() => setRefreshing(false));
  };

  // Opens the reminder details and marks unread reminders as read.
  const handleOpenMessage = useCallback(item => {
    if (!item.readAt) {
      markNotificationInboxItemReadAsync(item.id).then(readAt => {
        if (!readAt) {
          return;
        }

        setMessages(previousMessages =>
          previousMessages.map(message =>
            message.id === item.id ? { ...message, readAt } : message
          )
        );
      });
    }

    Alert.alert(
      item.title,
      `Priority: ${item.severity.toUpperCase()}\nType: ${item.type}\nBatch: ${item.batchLabel}\nFarm: ${item.farmName}\nLocation: ${item.farmLocation}\n\n${item.detail}`
    );
  }, []);

  // Applies the selected inbox filter before rendering the message list.
  const filteredMessages = useMemo(() => {
    if (selectedFilter === 'all') {
      return messages;
    }

    if (selectedFilter === 'unread') {
      return messages.filter(item => !item.readAt);
    }

    return messages.filter(item => item.severity === selectedFilter);
  }, [messages, selectedFilter]);

  // Calculates the summary counts shown at the top of the inbox.
  const summary = useMemo(() => ({
    total: messages.length,
    unread: messages.filter(item => !item.readAt).length,
    critical: messages.filter(item => item.severity === 'critical').length,
  }), [messages]);

  return (
    <ScreenBackground
      scroll
      contentContainerStyle={[styles.container, extraBottomPadding ? { paddingBottom: extraBottomPadding } : null]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />}
    >
      <Text style={styles.title}>Reminders</Text>
      {currentUser?.role ? (
        <Text style={styles.subtitle}>
          Message inbox for {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
        </Text>
      ) : (
        <Text style={styles.subtitle}>Message inbox for farm alerts</Text>
      )}

      {/* Shows the overall inbox totals. */}
      <View style={styles.summaryGrid}>
        <MessageSummary label="Messages" value={String(summary.total)} />
        <MessageSummary label="Unread" value={String(summary.unread)} />
        <MessageSummary label="Critical" value={String(summary.critical)} />
      </View>

      {/* Lets the user narrow the inbox by read state or severity. */}
      <View style={styles.filterRow}>
        {FILTERS.map(filter => {
          const isSelected = selectedFilter === filter.key;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, isSelected ? styles.filterChipSelected : null]}
              activeOpacity={0.85}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextSelected : null]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Renders matching reminders or a simple empty state. */}
      <View style={styles.listPanel}>
        {filteredMessages.length ? filteredMessages.map(item => (
          <MessageListItem
            key={item.id}
            item={item}
            onPress={() => handleOpenMessage(item)}
          />
        )) : (
          <Text style={styles.emptyText}>No reminder messages right now.</Text>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Screen layout and heading styles.
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
  // Summary count card styles.
  summaryGrid: {
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 8,
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
  // Filter chip styles.
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
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
  // Message list container and row styles.
  listPanel: {
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    borderRadius: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  messageRowUnread: {
    backgroundColor: '#ffffff',
  },
  // Severity avatar styles.
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
  // Message body text and metadata styles.
  messageBody: {
    flex: 1,
  },
  messageTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  senderRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  messageSender: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  messageTime: {
    color: '#64748b',
    fontSize: 12,
  },
  messageTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageTitleUnread: {
    fontWeight: '800',
  },
  messagePreview: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  messageMeta: {
    flex: 1,
    color: '#64748b',
    fontSize: 12,
  },
  messageBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  // Severity badge color styles.
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
  // Empty inbox message style.
  emptyText: {
    color: '#475569',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
});

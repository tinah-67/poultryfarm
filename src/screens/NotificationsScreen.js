import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import {
  getAccessibleFarms,
  getBatchesByFarmId,
  getFeedRecordsByBatchId,
  getMortalityRecordsByBatchId,
  getSalesByBatchId,
  getUserById,
  getVaccinationRecordsByBatchId,
} from '../database/db';

const SEVERITY_ORDER = {
  critical: 0,
  warning: 1,
  info: 2,
};

const MILESTONE_DAYS = [7, 14, 21, 28, 35, 42];

const parseLocalDate = value => {
  if (!value) {
    return null;
  }

  const rawValue = String(value).trim();

  if (!rawValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const [year, month, day] = rawValue.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDaysBetween = (firstDate, secondDate) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((startOfDay(firstDate).getTime() - startOfDay(secondDate).getTime()) / millisecondsPerDay);
};

const NotificationCard = ({ label, value }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const NotificationListItem = ({ item, onPress }) => (
  <TouchableOpacity style={styles.notificationItem} activeOpacity={0.85} onPress={onPress}>
    <View style={styles.notificationHeader}>
      <View style={styles.notificationHeaderLeft}>
        <View style={[styles.notificationDot, styles[`${item.severity}Dot`]]} />
        <Text style={styles.notificationSender}>Farm Notification</Text>
      </View>
      <Text style={styles.notificationType}>{item.type}</Text>
    </View>
    <Text style={styles.notificationMessage}>{item.title}</Text>
    <Text style={styles.notificationPreview} numberOfLines={1}>
      {item.detail}
    </Text>
    <Text style={styles.notificationMeta}>
      {item.batchLabel} - {item.farmName} - {item.farmLocation}
    </Text>
  </TouchableOpacity>
);

const getBatchLabel = batch => {
  const breed = String(batch?.breed || '').trim();
  const startDate = String(batch?.start_date || '').trim();

  if (breed && startDate) {
    return `${breed} batch (${startDate})`;
  }

  if (breed) {
    return `${breed} batch`;
  }

  return `Batch #${batch?.batch_id ?? 'N/A'}`;
};

const canRoleSeeNotification = (role, notificationType) => {
  if (role === 'owner') {
    return true;
  }

  if (role === 'manager') {
    return [
      'Vaccination',
      'Mortality',
      'Sale readiness',
      'Feed records',
      'Low birds',
      'Batch status',
    ].includes(notificationType);
  }

  if (role === 'worker') {
    return [
      'Vaccination',
      'Mortality',
      'Feed records',
      'Age milestone',
    ].includes(notificationType);
  }

  return false;
};

export default function NotificationsScreen({ route }) {
  const userId = route?.params?.userId;
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);

  const finalizeNotifications = useCallback((items, role, done) => {
    setNotifications(
      items
        .filter(item => canRoleSeeNotification(role, item.type))
        .sort((left, right) => {
          const severityDifference = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
          if (severityDifference !== 0) {
            return severityDifference;
          }

          return left.title.localeCompare(right.title);
        })
    );
    done && done();
  }, []);

  const loadNotifications = useCallback((done) => {
    if (!userId) {
      setCurrentUser(null);
      setNotifications([]);
      done && done();
      return;
    }

    const today = startOfDay(new Date());

    getUserById(userId, user => {
      setCurrentUser(user);

      getAccessibleFarms(userId, farms => {
        const safeFarms = farms || [];

        if (safeFarms.length === 0) {
          setNotifications([]);
          done && done();
          return;
        }

        const nextNotifications = [];
        let processedFarms = 0;

        safeFarms.forEach(farm => {
          getBatchesByFarmId(farm.farm_id, batches => {
            const safeBatches = batches || [];

            if (safeBatches.length === 0) {
              processedFarms += 1;

              if (processedFarms === safeFarms.length) {
                finalizeNotifications(nextNotifications, user?.role, done);
              }

              return;
            }

            let processedBatches = 0;

            safeBatches.forEach(batch => {
              getFeedRecordsByBatchId(batch.batch_id, feedRecords => {
                getMortalityRecordsByBatchId(batch.batch_id, mortalityRecords => {
                  getSalesByBatchId(batch.batch_id, saleRecords => {
                    getVaccinationRecordsByBatchId(batch.batch_id, vaccinationRecords => {
                    const safeFeedRecords = feedRecords || [];
                    const safeMortalityRecords = mortalityRecords || [];
                    const safeSaleRecords = saleRecords || [];
                    const safeVaccinationRecords = vaccinationRecords || [];
                    const initialChicks = Number(batch.initial_chicks || 0);
                    const totalDead = safeMortalityRecords.reduce(
                      (sum, item) => sum + Number(item.number_dead || 0),
                      0
                    );
                    const totalSold = safeSaleRecords.reduce(
                      (sum, item) => sum + Number(item.birds_sold || 0),
                      0
                    );
                    const batchLabel = getBatchLabel(batch);
                    const birdsAlive = Math.max(initialChicks - totalDead - totalSold, 0);
                    const mortalityRate = initialChicks > 0 ? (totalDead / initialChicks) * 100 : 0;
                    const batchStartDate = parseLocalDate(batch.start_date);
                    const ageInDays = batchStartDate ? getDaysBetween(today, batchStartDate) : null;
                    const isActive = String(batch.status || 'active').toLowerCase() === 'active';
                    const latestFeedDate = safeFeedRecords
                      .map(item => parseLocalDate(item.date_recorded))
                      .filter(Boolean)
                      .sort((left, right) => right - left)[0] || null;
                    const daysSinceLastFeed = latestFeedDate ? getDaysBetween(today, latestFeedDate) : null;
                    const lowBirdThreshold = Math.max(10, Math.ceil(initialChicks * 0.1));

                    if (isActive && ageInDays != null && MILESTONE_DAYS.includes(ageInDays)) {
                      nextNotifications.push({
                        id: `milestone-${batch.batch_id}-${ageInDays}`,
                        severity: 'info',
                        type: 'Age milestone',
                        farmName: farm.farm_name,
                        farmLocation: farm.location || 'N/A',
                        batchLabel,
                        batchId: batch.batch_id,
                        title: `Batch reached day ${ageInDays}`,
                        detail: `${batch.breed || 'Broiler'} batch has reached an important growth milestone.`,
                      });
                    }

                    if (isActive && mortalityRate >= 5) {
                      nextNotifications.push({
                        id: `mortality-${batch.batch_id}`,
                        severity: mortalityRate >= 10 ? 'critical' : 'warning',
                        type: 'Mortality',
                        farmName: farm.farm_name,
                        farmLocation: farm.location || 'N/A',
                        batchLabel,
                        batchId: batch.batch_id,
                        title: 'Mortality is above the normal threshold',
                        detail: `${totalDead} birds lost so far (${mortalityRate.toFixed(2)}%).`,
                      });
                    }

                    if (isActive && ageInDays != null && ageInDays >= 49 && birdsAlive > 0) {
                      nextNotifications.push({
                        id: `sale-ready-${batch.batch_id}`,
                        severity: 'warning',
                        type: 'Sale readiness',
                        farmName: farm.farm_name,
                        farmLocation: farm.location || 'N/A',
                        batchLabel,
                        batchId: batch.batch_id,
                        title: 'Batch is near or at market age',
                        detail: `${birdsAlive} birds are still available at approximately day ${ageInDays}.`,
                      });
                    }

                    if (isActive && birdsAlive > 0 && birdsAlive <= lowBirdThreshold && totalSold > 0) {
                      nextNotifications.push({
                        id: `low-stock-${batch.batch_id}`,
                        severity: 'info',
                        type: 'Low birds',
                        farmName: farm.farm_name,
                        farmLocation: farm.location || 'N/A',
                        batchLabel,
                        batchId: batch.batch_id,
                        title: 'Few birds remain in this batch',
                        detail: `${birdsAlive} birds are left unsold.`,
                      });
                    }

                    if (isActive && safeFeedRecords.length === 0) {
                      nextNotifications.push({
                        id: `feed-missing-${batch.batch_id}`,
                        severity: ageInDays != null && ageInDays >= 3 ? 'warning' : 'info',
                        type: 'Feed records',
                        farmName: farm.farm_name,
                        farmLocation: farm.location || 'N/A',
                        batchLabel,
                        batchId: batch.batch_id,
                        title: 'No feed records have been entered',
                        detail: 'Record feed usage to keep the batch history complete.',
                      });
                    } else if (isActive && daysSinceLastFeed != null && daysSinceLastFeed >= 2) {
                      nextNotifications.push({
                        id: `feed-stale-${batch.batch_id}`,
                        severity: 'warning',
                        type: 'Feed records',
                        farmName: farm.farm_name,
                        farmLocation: farm.location || 'N/A',
                        batchLabel,
                        batchId: batch.batch_id,
                        title: 'Feed records may be outdated',
                        detail: `The last feed entry was ${daysSinceLastFeed} day(s) ago.`,
                      });
                    }

                    safeVaccinationRecords.forEach(record => {
                      const nextDueDate = parseLocalDate(record.next_due_date);

                      if (!isActive || !nextDueDate) {
                        return;
                      }

                      const daysUntilDue = getDaysBetween(nextDueDate, today);

                      if (daysUntilDue < 0) {
                        nextNotifications.push({
                          id: `vaccination-overdue-${record.vaccination_id}`,
                          severity: 'critical',
                          type: 'Vaccination',
                          farmName: farm.farm_name,
                          farmLocation: farm.location || 'N/A',
                          batchLabel,
                          batchId: batch.batch_id,
                          title: `${record.vaccine_name || 'Vaccination'} is overdue`,
                          detail: `It was due on ${record.next_due_date}.`,
                        });
                        return;
                      }

                      if (daysUntilDue <= 1) {
                        nextNotifications.push({
                          id: `vaccination-due-${record.vaccination_id}`,
                          severity: daysUntilDue === 0 ? 'warning' : 'info',
                          type: 'Vaccination',
                          farmName: farm.farm_name,
                          farmLocation: farm.location || 'N/A',
                          batchLabel,
                          batchId: batch.batch_id,
                          title: `${record.vaccine_name || 'Vaccination'} is due soon`,
                          detail: daysUntilDue === 0
                            ? `Due today (${record.next_due_date}).`
                            : `Due in ${daysUntilDue} day(s) on ${record.next_due_date}.`,
                        });
                      }
                    });

                    if (!isActive && birdsAlive > 0) {
                      nextNotifications.push({
                        id: `completed-with-birds-${batch.batch_id}`,
                        severity: 'warning',
                        type: 'Batch status',
                        farmName: farm.farm_name,
                        farmLocation: farm.location || 'N/A',
                        batchLabel,
                        batchId: batch.batch_id,
                        title: 'Batch is closed but birds still remain',
                        detail: `${birdsAlive} birds are still recorded as alive in this completed batch.`,
                      });
                    }

                    processedBatches += 1;

                    if (processedBatches === safeBatches.length) {
                      processedFarms += 1;

                      if (processedFarms === safeFarms.length) {
                        finalizeNotifications(nextNotifications, user?.role, done);
                      }
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
    });
  }, [finalizeNotifications, userId]);

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
      contentContainerStyle={styles.container}
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

      <View style={styles.listCard}>
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
  listCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  notificationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  criticalDot: {
    backgroundColor: '#b91c1c',
  },
  warningDot: {
    backgroundColor: '#b45309',
  },
  infoDot: {
    backgroundColor: '#1d4ed8',
  },
  notificationSender: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  notificationType: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationMessage: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  notificationPreview: {
    color: '#475569',
    fontSize: 14,
    marginBottom: 6,
  },
  notificationMeta: {
    color: '#64748b',
    lineHeight: 18,
  },
  emptyText: {
    color: '#e2e8f0',
    textAlign: 'center',
    paddingVertical: 12,
  },
  criticalText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  warningText: {
    color: '#b45309',
    fontWeight: '700',
  },
  infoText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});

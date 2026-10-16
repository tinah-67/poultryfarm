import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAccessibleFarms, getBatchesByFarmId, getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

const getUserByIdAsync = userId => new Promise(resolve => getUserById(userId, resolve));
const getAccessibleFarmsAsync = userId => new Promise(resolve => getAccessibleFarms(userId, resolve));
const getBatchesByFarmIdAsync = farmId => new Promise(resolve => getBatchesByFarmId(farmId, resolve));

export default function QuickRecordScreen({ route, navigation }) {
  const userId = route?.params?.userId;
  const requestedAction = route?.params?.action;
  const [currentUser, setCurrentUser] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadQuickRecordData = useCallback(async isCurrent => {
    if (!userId) {
      setCurrentUser(null);
      setBatches([]);
      setLoadFailed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadFailed(false);

    try {
      const [user, farms] = await Promise.all([
        getUserByIdAsync(userId),
        getAccessibleFarmsAsync(userId),
      ]);
      const farmBatches = await Promise.all((farms || []).map(async farm => {
        const farmRecords = await getBatchesByFarmIdAsync(farm.farm_id);
        return (farmRecords || []).map(batch => ({
          ...batch,
          farm_name: farm.farm_name,
          farm_location: farm.location,
        }));
      }));

      if (!isCurrent()) return;

      setCurrentUser(user || null);
      setBatches(farmBatches.flat().filter(batch => (
        String(batch.status || 'active').toLowerCase() !== 'completed'
      )));
    } catch (error) {
      console.log('Could not load quick record flocks', error);
      if (isCurrent()) {
        setCurrentUser(null);
        setBatches([]);
        setLoadFailed(true);
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let isFocused = true;
      loadQuickRecordData(() => isFocused);
      return () => {
        isFocused = false;
      };
    }, [loadQuickRecordData])
  );

  const role = currentUser?.role;
  const availableActions = [
    ...(role === 'owner' || role === 'worker'
      ? [{ key: 'collectEggs', label: 'Collect eggs', color: '#15803d' }]
      : []),
    ...(role === 'owner' || role === 'manager'
      ? [
          { key: 'sellEggs', label: 'Sell eggs', color: '#1d4ed8' },
          { key: 'sellBirds', label: 'Sell birds', color: '#7c3aed' },
        ]
      : []),
  ];
  const selectedAction = availableActions.find(action => action.key === requestedAction);

  const handleBatchPress = batch => {
    if (!selectedAction) return;

    if (requestedAction === 'collectEggs') {
      navigation.navigate('RecordEggCollection', {
        batchId: batch.batch_id,
        userId,
      });
      return;
    }

    navigation.navigate('Sales', {
      batchId: batch.batch_id,
      userId,
      saleType: requestedAction === 'sellEggs' ? 'eggs' : 'birds',
    });
  };

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container}>
      <Text style={styles.title}>Choose a flock</Text>
      <Text style={styles.subtitle}>
        {selectedAction
          ? 'Select the flock for ' + selectedAction.label.toLowerCase() + '.'
          : 'Your account does not have permission for this quick action.'}
      </Text>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.statusText}>Loading your flocks...</Text>
        </View>
      ) : null}


      {!loading && !loadFailed && selectedAction && batches.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No active flocks</Text>
          <Text style={styles.emptyText}>Add or activate a flock before recording this task.</Text>
        </View>
      ) : null}

      {!loading && !loadFailed && batches.map(batch => (
        <TouchableOpacity
          key={String(batch.batch_id)}
          style={styles.batchCard}
          onPress={() => handleBatchPress(batch)}
          disabled={!selectedAction}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel={
            'Select ' + (batch.breed || 'flock') + ' flock at ' + (batch.farm_name || 'farm')
          }
        >
          <View style={styles.batchHeader}>
            <View style={styles.batchHeading}>
              <Text style={styles.farmName}>{batch.farm_name || 'Farm'}</Text>
              {batch.farm_location ? (
                <Text style={styles.farmLocation}>{batch.farm_location}</Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.batchDetails}>
            {(batch.breed || 'Flock') + ' - ' + Number(batch.initial_chicks || 0) + ' birds'}
          </Text>
          <Text style={styles.batchAction}>
            {selectedAction ? 'Tap to ' + selectedAction.label.toLowerCase() : 'Action unavailable'}
          </Text>
        </TouchableOpacity>
      ))}

      {!loading && loadFailed ? (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            loadQuickRecordData(() => true);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#dbeafe', fontSize: 14, marginBottom: 4 },
  status: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  statusText: { color: '#fff' },
  batchCard: {
    padding: 16,
    borderRadius: 15,
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    elevation: 3,
  },
  batchHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  batchHeading: { flex: 1 },
  farmName: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  farmLocation: { color: '#64748b', fontSize: 12, marginTop: 2 },
  batchDetails: { color: '#334155', marginTop: 10 },
  batchAction: { color: '#15803d', fontWeight: '700', marginTop: 10 },
  emptyCard: { padding: 16, borderRadius: 15, backgroundColor: 'rgba(248, 250, 252, 0.96)' },
  emptyTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#475569', marginTop: 4 },
  retryButton: { padding: 14, borderRadius: 12, backgroundColor: '#1d4ed8' },
  retryText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
});

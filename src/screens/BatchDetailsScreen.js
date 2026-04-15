import React, { useCallback, useState } from 'react';
import { Alert, Text, Button, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getBatchById,
  getMortalityRecordsByBatchId,
  getSalesByBatchId,
  getUserById,
  updateBatchStatus,
} from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

export default function BatchDetailsScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const farmId = route?.params?.farmId;
  const farmName = route?.params?.farmName;
  const userId = route?.params?.userId;
  const [currentUser, setCurrentUser] = useState(null);
  const [batch, setBatch] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setCurrentUser(null);
      } else {
        getUserById(userId, user => {
          setCurrentUser(user);
        });
      }

      if (!batchId) {
        setBatch(null);
      } else {
        getBatchById(batchId, batchRecord => {
          setBatch(batchRecord);
        });
      }
    }, [batchId, userId])
  );

  const role = currentUser?.role;
  const canManageBatchStatus = role === 'owner' || role === 'manager';
  const canAccessFinancialActions = role === 'owner' || role === 'manager';
  const batchStatus = batch?.status || 'active';
  const isCompleted = batchStatus === 'completed';

  const canCompleteBatch = useCallback((callback) => {
    if (!batchId) {
      callback(false);
      return;
    }

    getBatchById(batchId, batchRecord => {
      if (!batchRecord) {
        callback(false);
        return;
      }

      getMortalityRecordsByBatchId(batchId, mortalityRecords => {
        getSalesByBatchId(batchId, salesRecords => {
          const initialChicks = Number(batchRecord.initial_chicks || 0);
          const totalMortality = (mortalityRecords || []).reduce(
            (sum, item) => sum + Number(item.number_dead || 0),
            0
          );
          const totalBirdsSold = (salesRecords || []).reduce(
            (sum, item) => sum + Number(item.birds_sold || 0),
            0
          );
          const birdsAvailableForSale = Math.max(initialChicks - totalMortality - totalBirdsSold, 0);

          callback(birdsAvailableForSale <= 0, birdsAvailableForSale);
        });
      });
    });
  }, [batchId]);

  const handleToggleBatchStatus = () => {
    if (!canManageBatchStatus) {
      Alert.alert('Access denied', 'Only owner and manager users can change batch status.');
      return;
    }

    if (!batchId) {
      Alert.alert('Error', 'Batch not found');
      return;
    }

    if (isCompleted) {
      Alert.alert('Batch Completed', 'Completed batches stay locked. Their records can still be viewed.');
      return;
    }

    canCompleteBatch((allowed, birdsAvailableForSale = 0) => {
      if (!allowed) {
        Alert.alert(
          'Cannot Complete Batch',
          `${birdsAvailableForSale} bird(s) are still available for sale in this batch. Record the remaining sales before completing it.`
        );
        return;
      }

      Alert.alert(
        'Update Batch Status',
        'Are you sure you want to mark this batch as completed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: () => {
              updateBatchStatus(batchId, 'completed');
              setBatch(previous => (previous ? { ...previous, status: 'completed' } : previous));
              Alert.alert('Success', 'Batch status updated to completed.');
            },
          },
        ]
      );
    });
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Batch Details</Text>
      <Text style={styles.meta}>Batch ID: {batchId}</Text>
      {farmName ? <Text style={styles.meta}>Farm: {farmName}</Text> : null}
      <Text style={[styles.meta, isCompleted ? styles.completedStatus : styles.activeStatus]}>
        Status: {batchStatus}
      </Text>
      <Text style={styles.meta}>
        {role
          ? `Signed in as ${role.charAt(0).toUpperCase()}${role.slice(1)}`
          : 'Loading role permissions...'}
      </Text>

      <Button title="Feeds" onPress={() => navigation.navigate('Feed', { batchId, userId })} />
      <Button title="Mortality" onPress={() => navigation.navigate('Mortality', { batchId, userId })} />
      <Button title="Vaccination" onPress={() => navigation.navigate('Vaccination', { batchId, userId })} />
      {canAccessFinancialActions ? (
        <Button title="Expenses" onPress={() => navigation.navigate('Expense', { batchId, farmId, farmName, userId })} />
      ) : null}
      {canAccessFinancialActions ? (
        <Button title="Sales" onPress={() => navigation.navigate('Sales', { batchId, userId })} />
      ) : null}
      <Button title="Batch Performance" onPress={() => navigation.navigate('BatchPerformance', { batchId, farmName, userId })} />
      {canManageBatchStatus && !isCompleted ? (
        <Button title="Complete Batch" onPress={handleToggleBatchStatus} />
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    color: '#fff',
    fontWeight: '700',
  },
  meta: {
    color: '#fff',
  },
  activeStatus: {
    color: '#bbf7d0',
    textTransform: 'capitalize',
  },
  completedStatus: {
    color: '#fecaca',
    textTransform: 'capitalize',
  },
});

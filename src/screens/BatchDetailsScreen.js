import React, { useCallback, useState } from 'react';
import { Alert, Text, Button, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBatchById, getUserById, updateBatchStatus } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

export default function BatchDetailsScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
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
  const batchStatus = batch?.status || 'active';
  const isCompleted = batchStatus === 'completed';

  const handleToggleBatchStatus = () => {
    if (!canManageBatchStatus) {
      Alert.alert('Access denied', 'Only owner and manager users can change batch status.');
      return;
    }

    if (!batchId) {
      Alert.alert('Error', 'Batch not found');
      return;
    }

    const nextStatus = isCompleted ? 'active' : 'completed';
    const actionLabel = isCompleted ? 'reactivate' : 'mark as completed';

    Alert.alert(
      'Update Batch Status',
      `Are you sure you want to ${actionLabel} this batch?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            updateBatchStatus(batchId, nextStatus);
            setBatch(previous => (previous ? { ...previous, status: nextStatus } : previous));
            Alert.alert('Success', `Batch status updated to ${nextStatus}.`);
          },
        },
      ]
    );
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
      <Button title="Expenses" onPress={() => navigation.navigate('Expense', { batchId, userId })} />
      <Button title="Sales" onPress={() => navigation.navigate('Sales', { batchId, userId })} />
      <Button title="Batch Performance" onPress={() => navigation.navigate('BatchPerformance', { batchId, farmName, userId })} />
      {canManageBatchStatus ? (
        <Button title={isCompleted ? 'Reactivate Batch' : 'Complete Batch'} onPress={handleToggleBatchStatus} />
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

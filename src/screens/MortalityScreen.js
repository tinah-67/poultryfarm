import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addMortalityRecord, getBatchById, getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

// Lets owner and worker users record mortality for an active batch.
export default function MortalityScreen({ route, navigation }) {
  // Stores route ids, mortality form fields, current user, and batch status.
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [numberDead, setNumberDead] = useState('');
  const [cause, setCause] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [batch, setBatch] = useState(null);

  // Reloads role and batch status whenever the screen receives focus.
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => {
          setCurrentUser(user);
        });
      } else {
        setCurrentUser(null);
      }

      if (batchId) {
        getBatchById(batchId, batchRecord => {
          setBatch(batchRecord);
        });
      } else {
        setBatch(null);
      }
    }, [batchId, userId])
  );

  const canRecordMortality = ['owner', 'worker'].includes(currentUser?.role);
  const isBatchCompleted = String(batch?.status || 'active').toLowerCase() === 'completed';

  // Validates permission, batch status, and mortality fields before saving.
  const handleAdd = () => {
    if (!canRecordMortality) {
      Alert.alert('Access denied', 'Only owner and worker users can record mortality.');
      return;
    }

    if (isBatchCompleted) {
      Alert.alert('Batch completed', 'Mortality entries are disabled for completed batches. You can still view past mortality records.');
      return;
    }

    if (!batchId) {
      Alert.alert('Error', 'Batch not found');
      return;
    }

    if (!numberDead || !cause.trim()) {
      Alert.alert('Error', 'Enter number dead and cause');
      return;
    }

    if (!/^\d+$/.test(numberDead.trim()) || Number(numberDead) <= 0) {
      Alert.alert('Error', 'Number dead must be a positive whole number');
      return;
    }

    addMortalityRecord(
      batchId,
      Number(numberDead),
      cause.trim(),
      new Date().toISOString(),
      () => {
        setNumberDead('');
        setCause('');
        Alert.alert('Success', 'Mortality record added');
      }
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Record Mortality</Text>
      {isBatchCompleted ? (
        <Text style={styles.lockedNote}>
          This batch is completed. New mortality entries are disabled, but you can still view the existing records.
        </Text>
      ) : null}
      {/* Shows entry fields only when mortality recording is allowed. */}
      {canRecordMortality && !isBatchCompleted ? (
        <>
          <TextInput
            placeholder="Number Dead"
            placeholderTextColor="#666"
            value={numberDead}
            onChangeText={setNumberDead}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            placeholder="Cause of Death"
            placeholderTextColor="#666"
            value={cause}
            onChangeText={setCause}
            style={styles.input}
          />
          <Button title="Add Mortality Record" onPress={handleAdd} />
        </>
      ) : isBatchCompleted ? null : (
        <Text style={styles.noteText}>You can review mortality records, but only owners and workers can add mortality entries.</Text>
      )}

      {/* Opens existing mortality records for the batch. */}
      <View style={styles.actions}>
        <Button title="View Mortality Records" onPress={() => navigation.navigate('ViewMortality', { batchId, userId })} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Mortality form, locked-state, and action styles.
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  lockedNote: { color: '#fecaca', marginBottom: 12 },
  noteText: { color: '#cbd5e1', marginBottom: 12 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#cbd5e1' },
  actions: { marginTop: 14 },
});

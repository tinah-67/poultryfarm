import React, { useCallback, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  addEggBreakageRecord,
  getBatchById,
  getEggAvailabilityByBatchId,
  getUserById,
} from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

const getLocalDateString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const isValidDate = dateText => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return false;
  }

  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && dateText <= getLocalDateString();
};

// Records eggs that break after collection was entered.
export default function RecordEggBreakageScreen({ route }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [breakageDate, setBreakageDate] = useState(getLocalDateString());
  const [eggsBroken, setEggsBroken] = useState('');
  const [availableEggs, setAvailableEggs] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [batch, setBatch] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => setCurrentUser(user));
      } else {
        setCurrentUser(null);
      }

      if (batchId) {
        getBatchById(batchId, batchRecord => setBatch(batchRecord));
        getEggAvailabilityByBatchId(batchId, count => setAvailableEggs(count));
      } else {
        setBatch(null);
        setAvailableEggs(0);
      }
    }, [batchId, userId])
  );

  const canRecordEggs = ['owner', 'worker'].includes(currentUser?.role);
  const isBatchCompleted = String(batch?.status || 'active').toLowerCase() === 'completed';

  const handleAdd = () => {
    if (!canRecordEggs) {
      Alert.alert('Access denied', 'Only owner and worker users can record egg breakage.');
      return;
    }

    if (isBatchCompleted) {
      Alert.alert('Batch completed', 'New egg breakage entries are disabled for completed flocks.');
      return;
    }

    if (!batchId) {
      Alert.alert('Error', 'Flock not found');
      return;
    }

    if (!isValidDate(breakageDate)) {
      Alert.alert('Invalid date', 'Enter a valid breakage date that is not in the future.');
      return;
    }

    if (!/^\d+$/.test(eggsBroken.trim()) || Number(eggsBroken) <= 0) {
      Alert.alert('Invalid broken-egg count', 'Enter a positive whole number of eggs broken after collection.');
      return;
    }

    const brokenCount = Number(eggsBroken);
    if (brokenCount > availableEggs) {
      Alert.alert('Breakage exceeds available eggs', `Only ${availableEggs} eggs are currently available.`);
      return;
    }

    addEggBreakageRecord(batchId, breakageDate, brokenCount, '', () => {
      setBreakageDate(getLocalDateString());
      setEggsBroken('');
      getEggAvailabilityByBatchId(batchId, count => setAvailableEggs(count));
      Alert.alert('Success', 'Post-collection egg breakage recorded.');
    });
  };

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container}>
      <Text style={styles.title}>Record Later Egg Breakage</Text>
      <Text style={styles.note}>Use this for eggs that break after the collection entry is saved.</Text>
      <Text style={styles.summary}>Available eggs: {availableEggs}</Text>
      {isBatchCompleted ? (
        <Text style={styles.note}>This flock is completed. New egg breakage entries are disabled.</Text>
      ) : canRecordEggs ? (
        <>
          <TextInput
            value={breakageDate}
            onChangeText={setBreakageDate}
            placeholder="Breakage date (YYYY-MM-DD)"
            placeholderTextColor="#64748b"
            style={styles.input}
          />
          <TextInput
            value={eggsBroken}
            onChangeText={setEggsBroken}
            placeholder="Eggs broken after collection"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            style={styles.input}
          />
          <Button title="Record Egg Breakage" onPress={handleAdd} />
        </>
      ) : (
        <Text style={styles.note}>Only owners and workers can record egg breakage.</Text>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  note: { color: '#cbd5e1' },
  summary: { color: '#fff', fontWeight: '700', marginVertical: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
});
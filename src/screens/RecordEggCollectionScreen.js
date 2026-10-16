import React, { useCallback, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  addEggCollectionRecord,
  getBatchById,
  getEggCollectionsByBatchId,
  getUserById,
} from '../database/db';
import ScreenBackground from '../components/ScreenBackground';
import { formatBatchAge } from '../utils/batchAge';

const getLocalDateString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const getWeekStartDate = dateString => {
  const [year, month, day] = String(dateString || '').split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (!year || !month || !day || Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

// Records collected and collection-time broken eggs for one batch.
export default function RecordEggCollectionScreen({ route }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [collectionDate, setCollectionDate] = useState(getLocalDateString());
  const [eggsCollected, setEggsCollected] = useState('');
  const [eggsBroken, setEggsBroken] = useState('');
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [batch, setBatch] = useState(null);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      setRecords([]);
      return;
    }

    getEggCollectionsByBatchId(batchId, data => setRecords(data || []));
  }, [batchId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => setCurrentUser(user));
      } else {
        setCurrentUser(null);
      }

      if (batchId) {
        getBatchById(batchId, batchRecord => setBatch(batchRecord));
      } else {
        setBatch(null);
      }

      loadRecords();
    }, [batchId, loadRecords, userId])
  );

  const canRecordEggs = ['owner', 'worker'].includes(currentUser?.role);
  const isBatchCompleted = String(batch?.status || 'active').toLowerCase() === 'completed';
  const batchAge = isValidDate(collectionDate)
    ? formatBatchAge(batch?.start_date, collectionDate)
    : null;

  const handleAdd = () => {
    if (!canRecordEggs) {
      Alert.alert('Access denied', 'Only owner and worker users can record egg collection.');
      return;
    }

    if (!batchId) {
      Alert.alert('Error', 'Flock not found');
      return;
    }

    if (isBatchCompleted) {
      Alert.alert('Batch completed', 'New egg collection entries are disabled for completed flocks.');
      return;
    }

    if (!isValidDate(collectionDate)) {
      Alert.alert('Invalid date', 'Enter a valid collection date that is not in the future.');
      return;
    }

    const selectedWeek = getWeekStartDate(collectionDate);
    const weeklyEntryCount = records.filter(
      record => getWeekStartDate(record.collection_date) === selectedWeek
    ).length;

    if (weeklyEntryCount >= 3) {
      Alert.alert('Weekly collection limit reached', 'You can record up to 3 egg collections per Monday-to-Sunday week.');
      return;
    }

    if (!/^\d+$/.test(eggsCollected.trim())) {
      Alert.alert('Invalid collection count', 'Enter a positive whole number for eggs collected.');
      return;
    }

    const collected = Number(eggsCollected);
    const brokenText = eggsBroken.trim();
    if (brokenText && !/^\d+$/.test(brokenText)) {
      Alert.alert('Invalid broken-egg count', 'Enter a whole number of zero or more, or leave it blank if none were broken.');
      return;
    }

    const broken = brokenText ? Number(brokenText) : 0;
    if (collected <= 0) {
      Alert.alert('Invalid collection', 'Collected eggs must be greater than zero.');
      return;
    }

    if (broken > collected) {
      Alert.alert('Broken eggs exceed collection', 'Broken eggs cannot exceed the total eggs collected.');
      return;
    }

    addEggCollectionRecord(batchId, collectionDate, collected, broken, () => {
      setCollectionDate(getLocalDateString());
      setEggsCollected('');
      setEggsBroken('');
      loadRecords();
      Alert.alert('Success', 'Egg collection recorded.');
    });
  };

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container}>
      <Text style={styles.title}>Record Egg Collection</Text>
      {batchAge ? <Text style={styles.ageNote}>Bird age on collection date: {batchAge}</Text> : null}
      <Text style={styles.note}>Up to 3 collection entries are allowed each Monday-to-Sunday week.</Text>
      {isBatchCompleted ? (
        <Text style={styles.note}>This flock is completed. New egg collection entries are disabled.</Text>
      ) : canRecordEggs ? (
        <>
          <TextInput
            value={collectionDate}
            onChangeText={setCollectionDate}
            placeholder="Collection date (YYYY-MM-DD)"
            placeholderTextColor="#64748b"
            style={styles.input}
          />
          <CountInput label="Eggs collected in this entry" value={eggsCollected} onChangeText={setEggsCollected} />
          <CountInput label="Broken eggs in this entry (enter 0 if none)" value={eggsBroken} onChangeText={setEggsBroken} />
          <Button title="Save Egg Collection" onPress={handleAdd} />
        </>
      ) : (
        <Text style={styles.note}>Only owners and workers can record egg collection.</Text>
      )}
    </ScreenBackground>
  );
}

const CountInput = ({ label, value, onChangeText }) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={label}
    placeholderTextColor="#64748b"
    keyboardType="number-pad"
    style={styles.input}
  />
);

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  note: { color: '#cbd5e1' },
  ageNote: { color: '#bbf7d0', fontWeight: '700' },
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

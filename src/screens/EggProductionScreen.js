import React, { useCallback, useState } from 'react';
import {
    Alert,
    Button,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    addEggCollectionRecord,
    deleteEggCollectionRecord,
    getBatchById,
    getEggAvailabilityByBatchId,
    getEggCollectionsByBatchId,
    getUserById,
} from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

const getLocalDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        '0',
    )}-${String(today.getDate()).padStart(2, '0')}`;
};

// Records daily egg collection and breakage for one flock.
export default function EggProductionScreen({ route }) {
    const batchId = route?.params?.batchId;
    const userId = route?.params?.userId;
    const [collectionDate, setCollectionDate] = useState(getLocalDateString());
    const [eggsCollected, setEggsCollected] = useState('');
    const [eggsBroken, setEggsBroken] = useState('');
    const [records, setRecords] = useState([]);
    const [availableEggs, setAvailableEggs] = useState(0);
    const [currentUser, setCurrentUser] = useState(null);
    const [batch, setBatch] = useState(null);

    const loadRecords = useCallback(() => {
    if (!batchId) {
        setRecords([]);
      setAvailableEggs(0);
        return;
        }

        getEggCollectionsByBatchId(batchId, data => setRecords(data || []));
        getEggAvailabilityByBatchId(batchId, count => setAvailableEggs(count));
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
        }, [batchId, loadRecords, userId]),
    );

    const canRecordEggs = ['owner', 'worker'].includes(currentUser?.role);
    const isBatchCompleted =
        String(batch?.status || 'active').toLowerCase() === 'completed';
    const totalCollected = records.reduce(
        (sum, record) => sum + Number(record.eggs_collected || 0),
        0,
    );
    const totalBroken = records.reduce(
      (sum, record) => sum + Number(record.eggs_broken || 0),
      0,
    );
    const columns = [
      { key: 'date', title: 'Collection Date', width: 150 },
      { key: 'collected', title: 'Collected', width: 110 },
      { key: 'broken', title: 'Broken', width: 100 },
      { key: 'actions', title: 'Actions', width: 110 },
    ];

    const isValidDate = dateText => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
        return false;
        }

        const [year, month, day] = dateText.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day &&
        dateText <= getLocalDateString()
        );
    };

    const handleAdd = () => {
        if (!canRecordEggs) {
        Alert.alert(
            'Access denied',
            'Only owner and worker users can record egg collection.',
        );
        return;
        }

        if (!batchId) {
        Alert.alert('Error', 'Flock not found');
        return;
        }

        if (!isValidDate(collectionDate)) {
        Alert.alert(
            'Invalid date',
            'Enter a valid collection date that is not in the future.',
        );
        return;
        }

      if (!/^\d+$/.test(eggsCollected.trim())) {
        Alert.alert(
            'Invalid collection count',
        'Enter a positive whole number for eggs collected.',
        );
        return;
        }

      const collected = Number(eggsCollected);
      const brokenText = eggsBroken.trim();
      if (brokenText && !/^\d+$/.test(brokenText)) {
        Alert.alert(
          'Invalid broken-egg count',
          'Enter a whole number of zero or more for broken eggs, or leave it blank if none were broken.',
        );
        return;
      }

      const broken = brokenText ? Number(brokenText) : 0;
    if (collected <= 0) {
      Alert.alert(
        'Invalid collection',
        'Collected eggs must be greater than zero.',
      );
      return;
    }

    if (broken > collected) {
      Alert.alert(
        'Broken eggs exceed collection',
        'Broken eggs cannot exceed the total eggs collected.',
      );
      return;
    }

    addEggCollectionRecord(
      batchId,
      collectionDate,
      collected,
      broken,
      () => {
        setCollectionDate(getLocalDateString());
        setEggsCollected('');
        setEggsBroken('');
        loadRecords();
        Alert.alert('Success', 'Egg collection recorded.');
      },
    );
  };

  const handleDelete = id => {
    if (!canRecordEggs) {
      Alert.alert(
        'Access denied',
        'Only owner and worker users can delete egg collection records.',
      );
      return;
    }

    Alert.alert('Delete egg record', 'Delete this collection record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEggCollectionRecord(id);
          loadRecords();
        },
      },
    ]);
  };

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container}>
      <Text style={styles.title}>Egg Production</Text>
      <Text style={styles.subtitle}>Batch ID: {batchId ?? 'N/A'}</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summary}>Collected: {totalCollected} eggs</Text>
        <Text style={styles.summary}>
          Broken: {totalBroken} eggs
        </Text>
        <Text style={styles.summary}>Available to sell: {availableEggs} eggs</Text>
      </View>

      <Text style={styles.sectionTitle}>Daily Collection</Text>
      {isBatchCompleted ? (
        <Text style={styles.note}>
          This flock is completed. New egg collection entries are disabled.
        </Text>
      ) : canRecordEggs ? (
        <>
          <TextInput
            value={collectionDate}
            onChangeText={setCollectionDate}
            placeholder="Collection date (YYYY-MM-DD)"
            placeholderTextColor="#64748b"
            style={styles.input}
          />
          <CountInput
            label="Eggs collected"
            value={eggsCollected}
            onChangeText={setEggsCollected}
          />
          <CountInput
            label="Eggs broken (enter 0 if none)"
            value={eggsBroken}
            onChangeText={setEggsBroken}
          />
          <Button title="Save Egg Collection" onPress={handleAdd} />
        </>
      ) : (
        <Text style={styles.note}>
          Only owners and workers can record or delete egg collection records.
        </Text>
      )}

      <Text style={styles.sectionTitle}>Collection History</Text>
      <DataTable
        columns={columns}
        data={records}
        keyExtractor={(item, index) => String(item.egg_collection_id || index)}
        emptyText="No egg collections recorded for this flock yet."
        renderCell={(item, column) => {
          if (column.key === 'date')
            return <Text style={styles.cellText}>{item.collection_date}</Text>;
          if (column.key === 'collected')
            return <Text style={styles.cellText}>{item.eggs_collected}</Text>;
          if (column.key === 'broken')
            return <Text style={styles.cellText}>{item.eggs_broken}</Text>;
          if (column.key === 'actions') {
            return canRecordEggs ? (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.egg_collection_id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.viewOnly}>View only</Text>
            );
          }
          return null;
        }}
      />
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
  container: { padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitle: { color: '#e2e8f0' },
  summaryRow: { gap: 4, marginVertical: 4 },
  summary: { color: '#fff', fontWeight: '700' },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  note: { color: '#cbd5e1' },
  cellText: { color: '#334155' },
  deleteButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 5,
  },
  deleteButtonText: { color: '#b91c1c', fontWeight: '600' },
  viewOnly: { color: '#64748b', fontStyle: 'italic' },
});

import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addMortalityRecord, getMortalityRecordsByBatchId, deleteMortalityRecord } from '../database/db';
import DataTable from '../components/DataTable';

export default function MortalityScreen({ route }) {
  const batchId = route?.params?.batchId;
  const [numberDead, setNumberDead] = useState('');
  const [cause, setCause] = useState('');
  const [records, setRecords] = useState([]);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      return;
    }

    getMortalityRecordsByBatchId(batchId, setRecords);
  }, [batchId]);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const handleAdd = () => {
    if (!batchId) {
      Alert.alert('Error', 'Batch not found');
      return;
    }

    if (!numberDead || !cause.trim()) {
      Alert.alert('Error', 'Enter number dead and cause');
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
        loadRecords();
      }
    );
  };

  const handleDelete = (mortalityId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this mortality record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMortalityRecord(mortalityId);
            loadRecords();
          },
        },
      ]
    );
  };

  const totalDead = records.reduce((sum, item) => sum + Number(item.number_dead || 0), 0);
  const columns = [
    { key: 'number_dead', title: 'Number Dead', width: 120 },
    { key: 'cause', title: 'Cause', width: 180 },
    { key: 'date', title: 'Recorded On', width: 210 },
    { key: 'actions', title: 'Actions', width: 120 },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mortality Records</Text>
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
      <Text style={styles.summary}>Total Dead: {totalDead}</Text>

      <View style={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={records}
          keyExtractor={(item, index) => (item.mortality_id || index).toString()}
          emptyText="No mortality records yet"
          renderCell={(item, column) => {
            if (column.key === 'number_dead') {
              return <Text style={styles.cellText}>{item.number_dead}</Text>;
            }

            if (column.key === 'cause') {
              return <Text style={styles.cellText}>{item.cause_of_death}</Text>;
            }

            if (column.key === 'date') {
              return <Text style={styles.cellText}>{item.date_recorded}</Text>;
            }

            if (column.key === 'actions') {
              return (
                <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.mortality_id)}>
                  <Text style={styles.dangerActionText}>Delete</Text>
                </TouchableOpacity>
              );
            }

            return null;
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f1f5f9' },
  title: { fontSize: 20, marginBottom: 10, color: '#0f172a', fontWeight: '700' },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: '#fff', borderColor: '#cbd5e1' },
  summary: { marginVertical: 10, fontWeight: 'bold', color: '#0f172a' },
  tableWrapper: { marginTop: 8 },
  cellText: { color: '#334155' },
  dangerAction: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  dangerActionText: { color: '#b91c1c', fontWeight: '600' },
});

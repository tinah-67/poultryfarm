import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addMortalityRecord, getMortalityRecordsByBatchId, deleteMortalityRecord, getUserById } from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

export default function MortalityScreen({ route }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [numberDead, setNumberDead] = useState('');
  const [cause, setCause] = useState('');
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      return;
    }

    getMortalityRecordsByBatchId(batchId, setRecords);
  }, [batchId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => {
          setCurrentUser(user);
        });
      } else {
        setCurrentUser(null);
      }

      loadRecords();
    }, [loadRecords, userId])
  );

  const canRecordMortality = currentUser?.role === 'worker';

  const handleAdd = () => {
    if (!canRecordMortality) {
      Alert.alert('Access denied', 'Only worker users can record mortality.');
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
    if (!canRecordMortality) {
      Alert.alert('Access denied', 'Only worker users can delete mortality records.');
      return;
    }

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
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mortality Records</Text>
      <Text style={styles.helperText}>
        {canRecordMortality
          ? 'Workers can add and remove mortality records for this batch.'
          : 'You can view mortality records here. Only workers can record or delete them.'}
      </Text>
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
      <Button title="Add Mortality Record" onPress={handleAdd} disabled={!canRecordMortality} />
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
                canRecordMortality ? (
                  <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.mortality_id)}>
                    <Text style={styles.dangerActionText}>Delete</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.viewOnlyText}>View only</Text>
                )
              );
            }

            return null;
          }}
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  helperText: { color: '#e2e8f0', marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#cbd5e1' },
  summary: { marginVertical: 10, fontWeight: 'bold', color: '#fff' },
  tableWrapper: { marginTop: 8 },
  cellText: { color: '#334155' },
  dangerAction: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  dangerActionText: { color: '#b91c1c', fontWeight: '600' },
  viewOnlyText: { color: '#64748b', fontStyle: 'italic' },
});

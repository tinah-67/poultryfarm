import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addMortalityRecord, getMortalityRecordsByBatchId, deleteMortalityRecord } from '../database/db';

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
    deleteMortalityRecord(mortalityId);
    loadRecords();
  };

  const totalDead = records.reduce((sum, item) => sum + Number(item.number_dead || 0), 0);

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

      <FlatList
        data={records}
        keyExtractor={(item, index) => (item.mortality_id || index).toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Number Dead: {item.number_dead}</Text>
            <Text>Cause: {item.cause_of_death}</Text>
            <Text>Date: {item.date_recorded}</Text>
            <Button title="Delete" onPress={() => handleDelete(item.mortality_id)} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No mortality records yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  summary: { marginVertical: 10, fontWeight: 'bold' },
  card: { padding: 10, borderWidth: 1, marginVertical: 5, borderRadius: 5 },
  emptyText: { textAlign: 'center', marginTop: 20 },
});

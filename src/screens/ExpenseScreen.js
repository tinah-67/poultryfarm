import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addExpenseRecord, getExpensesByBatchId, deleteExpenseRecord } from '../database/db';

export default function ExpenseScreen({ route }) {
  const batchId = route?.params?.batchId;
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [records, setRecords] = useState([]);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      return;
    }

    getExpensesByBatchId(batchId, setRecords);
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

    if (!description.trim() || !amount) {
      Alert.alert('Error', 'Enter description and amount');
      return;
    }

    addExpenseRecord(
      batchId,
      description.trim(),
      Number(amount),
      new Date().toISOString(),
      () => {
        setDescription('');
        setAmount('');
        loadRecords();
      }
    );
  };

  const handleDelete = (expenseId) => {
    deleteExpenseRecord(expenseId);
    loadRecords();
  };

  const totalExpenses = records.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expense Records</Text>
      <TextInput
        placeholder="Description"
        placeholderTextColor="#666"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />
      <TextInput
        placeholder="Amount"
        placeholderTextColor="#666"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={styles.input}
      />
      <Button title="Add Expense" onPress={handleAdd} />
      <Text style={styles.summary}>Total Expenses: {totalExpenses}</Text>

      <FlatList
        data={records}
        keyExtractor={(item, index) => (item.expense_id || index).toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Description: {item.description}</Text>
            <Text>Amount: {item.amount}</Text>
            <Text>Date: {item.expense_date}</Text>
            <Button title="Delete" onPress={() => handleDelete(item.expense_id)} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No expense records yet</Text>}
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

import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addExpenseRecord, getExpensesByBatchId, deleteExpenseRecord } from '../database/db';
import DataTable from '../components/DataTable';

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
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this expense record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteExpenseRecord(expenseId);
            loadRecords();
          },
        },
      ]
    );
  };

  const totalExpenses = records.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const columns = [
    { key: 'description', title: 'Description', width: 200 },
    { key: 'amount', title: 'Amount', width: 120 },
    { key: 'date', title: 'Recorded On', width: 180 },
    { key: 'actions', title: 'Actions', width: 120 },
  ];

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

      <View style={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={records}
          keyExtractor={(item, index) => (item.expense_id || index).toString()}
          emptyText="No expense records yet"
          renderCell={(item, column) => {
            if (column.key === 'description') {
              return <Text style={styles.cellText}>{item.description}</Text>;
            }

            if (column.key === 'amount') {
              return <Text style={styles.cellText}>{item.amount}</Text>;
            }

            if (column.key === 'date') {
              return <Text style={styles.cellText}>{item.expense_date}</Text>;
            }

            if (column.key === 'actions') {
              return (
                <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.expense_id)}>
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

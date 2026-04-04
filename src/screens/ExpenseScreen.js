import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addExpenseRecord, getExpensesByBatchId, deleteExpenseRecord, getUserById } from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

export default function ExpenseScreen({ route }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      return;
    }

    getExpensesByBatchId(batchId, setRecords);
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

  const canRecordExpense = currentUser?.role === 'manager';

  const handleAdd = () => {
    if (!canRecordExpense) {
      Alert.alert('Access denied', 'Only manager users can record expenses.');
      return;
    }

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
    if (!canRecordExpense) {
      Alert.alert('Access denied', 'Only manager users can delete expense records.');
      return;
    }

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
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Expense Records</Text>
      <Text style={styles.helperText}>
        {canRecordExpense
          ? 'Managers can add and remove expense records for this batch.'
          : 'You can view expense records here. Only managers can record or delete them.'}
      </Text>
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
      <Button title="Add Expense" onPress={handleAdd} disabled={!canRecordExpense} />
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
                canRecordExpense ? (
                  <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.expense_id)}>
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

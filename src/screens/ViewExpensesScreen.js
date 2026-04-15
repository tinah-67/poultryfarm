import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteExpenseRecord, getExpensesByBatchId, getExpensesByFarmId, getUserById } from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

export default function ViewExpensesScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const farmId = route?.params?.farmId;
  const farmName = route?.params?.farmName;
  const userId = route?.params?.userId;
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const isFarmExpenseView = farmId != null && !batchId;

  const loadRecords = useCallback(() => {
    if (isFarmExpenseView && farmId) {
      getExpensesByFarmId(farmId, setRecords);
      return;
    }

    if (!batchId) {
      setRecords([]);
      return;
    }

    getExpensesByBatchId(batchId, setRecords);
  }, [batchId, farmId, isFarmExpenseView]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => setCurrentUser(user));
      } else {
        setCurrentUser(null);
      }

      loadRecords();
    }, [loadRecords, userId])
  );

  const canDeleteExpense = ['owner', 'manager'].includes(currentUser?.role);
  const totalExpenses = records.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const title = isFarmExpenseView ? 'Farm Expense Records' : 'Batch Expense Records';
  const columns = [
    { key: 'description', title: 'Description', width: 200 },
    { key: 'amount', title: 'Amount', width: 120 },
    { key: 'date', title: 'Recorded On', width: 180 },
    { key: 'actions', title: 'Actions', width: 120 },
  ];

  const handleDelete = expenseId => {
    if (!canDeleteExpense) {
      Alert.alert('Access denied', 'Only owner and manager users can delete expense records.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this expense record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteExpenseRecord(expenseId); loadRecords(); } },
      ]
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {isFarmExpenseView && farmName ? <Text style={styles.contextText}>Farm: {farmName}</Text> : null}
      {!isFarmExpenseView && batchId ? <Text style={styles.contextText}>Batch ID: {batchId}</Text> : null}
      <Text style={styles.summary}>
        {isFarmExpenseView ? `Total Farm Expenses: ${totalExpenses}` : `Total Batch Expenses: ${totalExpenses}`}
      </Text>
      <View style={styles.actions}>
        <ButtonLink
          title={isFarmExpenseView ? 'Record Farm Expense' : 'Record Batch Expense'}
          onPress={() => navigation.navigate('Expense', { batchId, farmId, farmName, userId })}
        />
      </View>
      <View style={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={records}
          keyExtractor={(item, index) => (item.expense_id || index).toString()}
          emptyText="No expense records yet"
          renderCell={(item, column) => {
            if (column.key === 'description') return <Text style={styles.cellText}>{item.description}</Text>;
            if (column.key === 'amount') return <Text style={styles.cellText}>{item.amount}</Text>;
            if (column.key === 'date') return <Text style={styles.cellText}>{item.expense_date}</Text>;
            if (column.key === 'actions') {
              return canDeleteExpense ? (
                <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.expense_id)}>
                  <Text style={styles.dangerActionText}>Delete</Text>
                </TouchableOpacity>
              ) : <Text style={styles.viewOnlyText}>View only</Text>;
            }
            return null;
          }}
        />
      </View>
    </ScreenBackground>
  );
}

const ButtonLink = ({ title, onPress }) => (
  <TouchableOpacity style={styles.primaryAction} onPress={onPress}>
    <Text style={styles.primaryActionText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  contextText: { color: '#e2e8f0', marginBottom: 6 },
  summary: { marginBottom: 12, fontWeight: '700', color: '#fff' },
  actions: { marginBottom: 14 },
  tableWrapper: { marginTop: 8 },
  cellText: { color: '#334155' },
  primaryAction: { backgroundColor: '#1d4ed8', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignSelf: 'flex-start' },
  primaryActionText: { color: '#fff', fontWeight: '600' },
  dangerAction: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  dangerActionText: { color: '#b91c1c', fontWeight: '600' },
  viewOnlyText: { color: '#64748b', fontStyle: 'italic' },
});

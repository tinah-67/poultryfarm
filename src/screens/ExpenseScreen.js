import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addExpenseRecord, getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

export default function ExpenseScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => {
          setCurrentUser(user);
        });
      } else {
        setCurrentUser(null);
      }
    }, [userId])
  );

  const canRecordExpense = ['owner', 'manager'].includes(currentUser?.role);

  const handleAdd = () => {
    if (!canRecordExpense) {
      Alert.alert('Access denied', 'Only owner and manager users can record expenses.');
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
        Alert.alert('Success', 'Expense record added');
      }
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Record Expense</Text>
      {canRecordExpense ? (
        <>
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
        </>
      ) : (
        <Text style={styles.noteText}>You can review expense records, but only owners and managers can add expense entries.</Text>
      )}

      <View style={styles.actions}>
        <Button title="View Expense Records" onPress={() => navigation.navigate('ViewExpenses', { batchId, userId })} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  noteText: { color: '#cbd5e1', marginBottom: 12 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#cbd5e1' },
  actions: { marginTop: 14 },
});

import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addMortalityRecord, getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

export default function MortalityScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [numberDead, setNumberDead] = useState('');
  const [cause, setCause] = useState('');
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

  const canRecordMortality = ['owner', 'worker'].includes(currentUser?.role);

  const handleAdd = () => {
    if (!canRecordMortality) {
      Alert.alert('Access denied', 'Only owner and worker users can record mortality.');
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
        Alert.alert('Success', 'Mortality record added');
      }
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Record Mortality</Text>
      {canRecordMortality ? (
        <>
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
        </>
      ) : (
        <Text style={styles.noteText}>You can review mortality records, but only owners and workers can add mortality entries.</Text>
      )}

      <View style={styles.actions}>
        <Button title="View Mortality Records" onPress={() => navigation.navigate('ViewMortality', { batchId, userId })} />
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

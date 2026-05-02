import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  addSaleRecord,
  getBatchById,
  getMortalityRecordsByBatchId,
  getSalesByBatchId,
  getUserById,
} from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

export default function SalesScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [birdsSold, setBirdsSold] = useState('');
  const [pricePerBird, setPricePerBird] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [availableBirds, setAvailableBirds] = useState(0);
  const [batch, setBatch] = useState(null);

  const loadAvailableBirds = useCallback((done) => {
    if (!batchId) {
      setAvailableBirds(0);
      done && done();
      return;
    }

    getBatchById(batchId, batchRecord => {
      if (!batchRecord) {
        setBatch(null);
        setAvailableBirds(0);
        done && done();
        return;
      }

      setBatch(batchRecord);

      getMortalityRecordsByBatchId(batchId, mortalityRecords => {
        getSalesByBatchId(batchId, salesRecords => {
          const initialChicks = Number(batchRecord.initial_chicks || 0);
          const totalMortality = (mortalityRecords || []).reduce(
            (sum, item) => sum + Number(item.number_dead || 0),
            0
          );
          const totalBirdsSold = (salesRecords || []).reduce(
            (sum, item) => sum + Number(item.birds_sold || 0),
            0
          );

          setAvailableBirds(Math.max(initialChicks - totalMortality - totalBirdsSold, 0));
          done && done();
        });
      });
    });
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

      loadAvailableBirds();
    }, [loadAvailableBirds, userId])
  );

  const canRecordSales = ['owner', 'manager'].includes(currentUser?.role);
  const isBatchCompleted = String(batch?.status || 'active').toLowerCase() === 'completed';
  const handleAdd = () => {
    if (!canRecordSales) {
      Alert.alert('Access denied', 'Only owner and manager users can record sales.');
      return;
    }

    if (isBatchCompleted) {
      Alert.alert('Batch completed', 'Sales entries are disabled for completed batches. You can still view past sales records.');
      return;
    }

    if (!batchId) {
      Alert.alert('Error', 'Batch not found');
      return;
    }

    if (!birdsSold || !pricePerBird) {
      Alert.alert('Error', 'Enter birds sold and price per bird');
      return;
    }

    if (!/^\d+$/.test(birdsSold.trim()) || Number(birdsSold) <= 0) {
      Alert.alert('Error', 'Birds sold must be a positive whole number');
      return;
    }

    const priceValue = Number(pricePerBird);

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      Alert.alert('Error', 'Price per bird must be a valid number greater than 0');
      return;
    }

    const birdsToSell = Number(birdsSold);

    if (birdsToSell > availableBirds) {
      Alert.alert('Not enough birds', `Only ${availableBirds} birds are currently available for sale in this batch.`);
      return;
    }

    addSaleRecord(
      batchId,
      birdsToSell,
      priceValue,
      new Date().toISOString(),
      () => {
        setBirdsSold('');
        setPricePerBird('');
        loadAvailableBirds();
        Alert.alert('Success', 'Sale recorded');
      }
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Record Sales</Text>
      {isBatchCompleted ? (
        <Text style={styles.lockedNote}>
          This batch is completed. New sales entries are disabled, but you can still view the existing records.
        </Text>
      ) : null}
      <Text style={styles.summary}>Birds Available for Sale: {availableBirds}</Text>
      {canRecordSales && !isBatchCompleted ? (
        <>
          <TextInput
            placeholder="Birds Sold"
            placeholderTextColor="#666"
            value={birdsSold}
            onChangeText={setBirdsSold}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            placeholder="Price Per Bird"
            placeholderTextColor="#666"
            value={pricePerBird}
            onChangeText={setPricePerBird}
            keyboardType="numeric"
            style={styles.input}
          />
          <Button title="Add Sale" onPress={handleAdd} />
        </>
      ) : isBatchCompleted ? null : (
        <Text style={styles.noteText}>You can review sales records, but only owners and managers can add sales entries.</Text>
      )}

      <View style={styles.actions}>
        <Button title="View Sales Records" onPress={() => navigation.navigate('ViewSales', { batchId, userId })} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  lockedNote: { color: '#fecaca', marginBottom: 12 },
  noteText: { color: '#cbd5e1', marginBottom: 12 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#cbd5e1' },
  summary: { marginVertical: 10, fontWeight: 'bold', color: '#fff' },
  actions: { marginTop: 14 },
});

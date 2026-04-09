import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
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

  const loadAvailableBirds = useCallback((done) => {
    if (!batchId) {
      setAvailableBirds(0);
      done && done();
      return;
    }

    getBatchById(batchId, batch => {
      if (!batch) {
        setAvailableBirds(0);
        done && done();
        return;
      }

      getMortalityRecordsByBatchId(batchId, mortalityRecords => {
        getSalesByBatchId(batchId, salesRecords => {
          const initialChicks = Number(batch.initial_chicks || 0);
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

  const handleAdd = () => {
    if (!canRecordSales) {
      Alert.alert('Access denied', 'Only owner and manager users can record sales.');
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

    if (Number(pricePerBird) <= 0) {
      Alert.alert('Error', 'Price per bird must be greater than 0');
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
      Number(pricePerBird),
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
      <Text style={styles.summary}>Birds Available for Sale: {availableBirds}</Text>
      {canRecordSales ? (
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
      ) : (
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
  noteText: { color: '#cbd5e1', marginBottom: 12 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#cbd5e1' },
  summary: { marginVertical: 10, fontWeight: 'bold', color: '#fff' },
  actions: { marginTop: 14 },
});
